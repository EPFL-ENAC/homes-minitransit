from concurrent.futures import Future, ProcessPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path
import json
import os
import sys
import uuid

from api.models.simulation import (
    SimulationResultRetrieval,
    PendingResult,
    NotFoundResult,
    FinishedResult,
)

from minitransit_simulation import (
    SimulationRunner,
    SimulationRunnerConfig,
    SimulationRunnerInput,
    SimulationRunnerResult,
)


@dataclass
class SimulationInput:
    city_name: str
    input_params: SimulationRunnerInput
    services: dict | None = None


@dataclass
class SimulationRun:
    id: str
    inputs: SimulationInput
    result: SimulationRunnerResult | None = None

    def save_to_json(self, filepath: str):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, "w") as f:
            json.dump(
                {
                    "id": self.id,
                    "inputs": {
                        "city_name": self.inputs.city_name,
                        "input_params": asdict(self.inputs.input_params),
                    },
                    "result": asdict(self.result) if self.result else None,
                },
                f,
                indent=4,
            )

    @staticmethod
    def load_from_json(filepath: str) -> "SimulationRun":
        with open(filepath, "r") as f:
            data = json.load(f)
            inputs = SimulationInput(
                city_name=data["inputs"]["city_name"],
                input_params=SimulationRunnerInput(**data["inputs"]["input_params"]),
            )
            result = SimulationRunnerResult(**data["result"])
            return SimulationRun(id=data["id"], inputs=inputs, result=result)


class SimulationManager:
    def __init__(self):
        self.runs: dict[str, SimulationRun] = {}
        self.config = SimulationRunnerConfig.from_json(
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data",
                "simulation_config.json",
            )
        )
        self.output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "..",
            "simulation_results",
        )

        self.executor = ProcessPoolExecutor()
        self.futures: dict[str, Future] = {}

    def add_simulation_run(self, inputs: SimulationInput) -> SimulationRun:
        id = uuid.uuid4().hex
        run = SimulationRun(id=id, inputs=inputs)
        self.runs[id] = run

        future = self.executor.submit(_run_simulation, inputs, self.config)
        self.futures[id] = future

        def _on_done(fut):
            try:
                run.result = fut.result()
            except Exception as e:
                run.result = SimulationRunnerResult(
                    status="error", message=str(e), routes=[]
                )
                print(f"Error in simulation run {run.id}: {e}", file=sys.stderr)
            finally:
                run.save_to_json(self._make_output_filepath(run.id))
                self.futures.pop(run.id)

        future.add_done_callback(_on_done)

        return run

    def get_simulation_result(self, id: str) -> SimulationResultRetrieval:
        if id not in self.runs:
            output_filepath = self._make_output_filepath(id)
            if os.path.exists(output_filepath):
                run = SimulationRun.load_from_json(output_filepath)
                self.runs[id] = run
                return FinishedResult(result=run.result)

            return NotFoundResult()

        run = self.runs[id]
        if run.result is None:
            return PendingResult()

        return FinishedResult(result=run.result)

    def _make_output_filepath(self, run_id: str) -> str:
        return os.path.join(self.output_dir, f"{run_id}.json")


def _run_simulation(
    inputs: SimulationInput, config: SimulationRunnerConfig
) -> SimulationRunnerResult:
    runner = SimulationRunner(config)
    runner.init_area(
        geojson_path=os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data",
            inputs.city_name,
            f"{inputs.city_name}.geojson",
        ),
        demands_path=os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data",
            inputs.city_name,
            f"{inputs.city_name}_time_dependent_demands.csv",
        ),
    )
    runner.add_services_from_dict(inputs.services)
    result = runner.run_simulation(inputs.input_params)

    return result
