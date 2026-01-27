from pydantic_settings import BaseSettings
from functools import lru_cache


class Config(BaseSettings):
    PATH_PREFIX: str
    APP_URL: str = "https://mmsdb-dev.epfl.ch"


@lru_cache()
def get_config():
    return Config()


config = get_config()
