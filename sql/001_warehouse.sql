-- Run once on a dedicated PostgreSQL database. No browser credentials are needed.
CREATE SCHEMA IF NOT EXISTS agrodecide;
REVOKE ALL ON SCHEMA agrodecide FROM PUBLIC;
CREATE TABLE IF NOT EXISTS agrodecide.prices (
    fecha date NOT NULL,
    market_id text NOT NULL,
    variety text NOT NULL,
    product text NOT NULL CHECK (product='Papa'),
    price_pen_kg numeric NOT NULL CHECK (price_pen_kg>0 AND price_pen_kg<=100),
    volume_t numeric CHECK (volume_t IS NULL OR volume_t>=0),
    source_url text NOT NULL,
    source_file text NOT NULL,
    PRIMARY KEY(fecha,market_id,variety)
);
CREATE TABLE IF NOT EXISTS agrodecide.model_runs (
    run_id text NOT NULL,
    market_id text NOT NULL,
    variety text NOT NULL,
    generated_at timestamptz NOT NULL,
    evaluated_at timestamptz NOT NULL,
    cutoff date NOT NULL,
    data_hash text NOT NULL,
    model_version text NOT NULL,
    evaluation jsonb NOT NULL,
    PRIMARY KEY(run_id,market_id,variety)
);
CREATE TABLE IF NOT EXISTS agrodecide.forecasts (
    run_id text NOT NULL,
    market_id text NOT NULL,
    variety text NOT NULL,
    target_date date NOT NULL,
    price_pen_kg numeric NOT NULL CHECK(price_pen_kg>0),
    low_pen_kg numeric NOT NULL,
    high_pen_kg numeric NOT NULL,
    model_name text NOT NULL,
    evaluated_horizon integer NOT NULL,
    status text NOT NULL,
    CHECK(low_pen_kg>0 AND low_pen_kg<=price_pen_kg AND price_pen_kg<=high_pen_kg),
    PRIMARY KEY(run_id,market_id,variety,target_date),
    FOREIGN KEY(run_id,market_id,variety) REFERENCES agrodecide.model_runs(run_id,market_id,variety)
);
CREATE INDEX IF NOT EXISTS prices_variety_date ON agrodecide.prices(variety,market_id,fecha DESC);
CREATE INDEX IF NOT EXISTS forecasts_target ON agrodecide.forecasts(variety,market_id,target_date);
REVOKE ALL ON ALL TABLES IN SCHEMA agrodecide FROM PUBLIC;
