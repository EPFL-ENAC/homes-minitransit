from api.services.simulation import SimulationManager, SimulationInput
from api.models.simulation import SimulationResultRetrieval
from minitransit_simulation import SimulationRunnerInput
from fastapi import APIRouter
from fastapi_cache.decorator import cache
from pydantic import BaseModel


router = APIRouter()

manager = SimulationManager()


class PostRunSimulationBody(BaseModel):
    area_id: str
    input_params: SimulationRunnerInput
    services: dict | None = None


class PostRunSimulationResponse(BaseModel):
    run_id: str


@router.get(
    "/",
    status_code=200,
    description="Say hello",
)
@cache()
async def hello() -> str:
    return "Hello from simulation API!"


@router.post(
    "/simulate",
    status_code=200,
    description="Performs a simulation with given parameters",
    response_model=PostRunSimulationResponse,
)
async def run_simulation(body: PostRunSimulationBody) -> PostRunSimulationResponse:
    run = manager.add_simulation_run(
        SimulationInput(
            city_name=body.area_id,
            input_params=body.input_params,
            services=body.services,
        )
    )
    return PostRunSimulationResponse(run_id=run.id)


@router.get(
    "/simulate/{run_id}",
    status_code=200,
    description="Retrieves the result of a simulation",
    response_model=SimulationResultRetrieval,
)
async def get_result(run_id: str) -> SimulationResultRetrieval:
    result = manager.get_simulation_result(run_id)
    return result
