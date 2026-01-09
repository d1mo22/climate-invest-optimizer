-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Cluster (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  utm_north real NOT NULL,
  utm_east real NOT NULL,
  CONSTRAINT Cluster_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Cluster_risk (
  cluster_id smallint NOT NULL,
  risk_id smallint NOT NULL,
  exposure USER-DEFINED NOT NULL,
  sensitivity USER-DEFINED NOT NULL,
  consequence USER-DEFINED NOT NULL,
  probability USER-DEFINED NOT NULL,
  CONSTRAINT Cluster_risk_pkey PRIMARY KEY (cluster_id, risk_id),
  CONSTRAINT Cluster_risk_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.Cluster(id),
  CONSTRAINT Cluster_risk_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.Risk(id)
);
CREATE TABLE public.Country (
  name character varying NOT NULL UNIQUE,
  CONSTRAINT Country_pkey PRIMARY KEY (name)
);
CREATE TABLE public.Measure (
  name character varying NOT NULL UNIQUE,
  estimatedCost real NOT NULL,
  type USER-DEFINED NOT NULL,
  CONSTRAINT Measure_pkey PRIMARY KEY (name)
);
CREATE TABLE public.Risk (
  name text NOT NULL,
  svg text UNIQUE,
  id smallint UNIQUE,
  CONSTRAINT Risk_pkey PRIMARY KEY (name)
);
CREATE TABLE public.Risk_measures (
  risk_name text NOT NULL,
  measure_name text NOT NULL,
  CONSTRAINT Risk_measures_pkey PRIMARY KEY (risk_name, measure_name)
);
CREATE TABLE public.Shop (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  location text NOT NULL,
  utm_north real NOT NULL,
  utm_east real NOT NULL,
  totalRisk real,
  taxonomyCoverage real,
  surface real,
  carbonFootprint real,
  cluster_id smallint NOT NULL,
  CONSTRAINT Shop_pkey PRIMARY KEY (id),
  CONSTRAINT Shop_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.Cluster(id)
);
CREATE TABLE public.Shop_measure (
  shop_id smallint NOT NULL,
  measure_name text NOT NULL,
  CONSTRAINT Shop_measure_pkey PRIMARY KEY (shop_id, measure_name),
  CONSTRAINT Shop_measure_measure_name_fkey FOREIGN KEY (measure_name) REFERENCES public.Measure(name),
  CONSTRAINT Shop_measure_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.Shop(id)
);