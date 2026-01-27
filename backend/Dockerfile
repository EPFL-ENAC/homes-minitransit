FROM python:3.13.6-bookworm
ENV UV_VERSION=0.8.9

RUN apt-get update && apt-get install -y --no-install-recommends \
    git-lfs \
    # Required for pyproj
    libproj-dev \
    proj-bin \
    # Required for fiona / shapely / geopandas
    libgdal-dev \
    libgeos-dev \
    # Required for building C extensions
    g++ \
    && git lfs install \
    && rm -rf /var/lib/apt/lists/*

RUN pip install "uv==$UV_VERSION"

WORKDIR /app

COPY uv.lock pyproject.toml /app/
COPY start.sh /app/
COPY api /app/api

RUN uv pip install --system --no-cache-dir -e /app

ENTRYPOINT ["sh", "start.sh"]
