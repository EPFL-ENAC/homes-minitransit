from pydantic import BaseModel
from typing import Literal
from minitransit_simulation import SimulationRunnerResult


class FinishedResult(BaseModel):
    status: Literal["finished"] = "finished"
    result: SimulationRunnerResult


class PendingResult(BaseModel):
    status: Literal["pending"] = "pending"


class NotFoundResult(BaseModel):
    status: Literal["not_found"] = "not_found"


SimulationResultRetrieval = FinishedResult | PendingResult | NotFoundResult
