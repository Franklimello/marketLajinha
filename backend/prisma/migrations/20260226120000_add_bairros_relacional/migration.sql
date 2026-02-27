-- Estados
CREATE TABLE IF NOT EXISTS "Estados" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "sigla" TEXT NOT NULL,
  CONSTRAINT "Estados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Estados_sigla_key" ON "Estados"("sigla");

INSERT INTO "Estados" ("id", "nome", "sigla")
VALUES
  ('estado-mg', 'Minas Gerais', 'MG'),
  ('estado-es', 'Espírito Santo', 'ES')
ON CONFLICT ("sigla") DO NOTHING;

-- Cidades -> estado relacional
ALTER TABLE "Cidades" ADD COLUMN IF NOT EXISTS "estado_id" TEXT;
CREATE INDEX IF NOT EXISTS "Cidades_estado_id_idx" ON "Cidades"("estado_id");

UPDATE "Cidades"
SET "estado_id" = CASE
  WHEN UPPER(TRIM("estado")) = 'MG' THEN 'estado-mg'
  WHEN UPPER(TRIM("estado")) = 'ES' THEN 'estado-es'
  ELSE "estado_id"
END
WHERE "estado_id" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Cidades_estado_id_fkey'
  ) THEN
    ALTER TABLE "Cidades"
      ADD CONSTRAINT "Cidades_estado_id_fkey"
      FOREIGN KEY ("estado_id") REFERENCES "Estados"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Bairros estruturados
CREATE TABLE IF NOT EXISTS "Bairros" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "nome_normalizado" TEXT NOT NULL,
  "cidade_id" TEXT NOT NULL,
  "criado_por" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Bairros_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Bairros_cidade_id_idx" ON "Bairros"("cidade_id");
CREATE UNIQUE INDEX IF NOT EXISTS "Bairros_cidade_id_nome_normalizado_key" ON "Bairros"("cidade_id", "nome_normalizado");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Bairros_cidade_id_fkey'
  ) THEN
    ALTER TABLE "Bairros"
      ADD CONSTRAINT "Bairros_cidade_id_fkey"
      FOREIGN KEY ("cidade_id") REFERENCES "Cidades"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Bairros_criado_por_fkey'
  ) THEN
    ALTER TABLE "Bairros"
      ADD CONSTRAINT "Bairros_criado_por_fkey"
      FOREIGN KEY ("criado_por") REFERENCES "Usuarios"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Endereço relacional com bairro_id (compatível com campos legados cidade/bairro)
ALTER TABLE "EnderecoCliente" ADD COLUMN IF NOT EXISTS "bairro_id" TEXT;
CREATE INDEX IF NOT EXISTS "EnderecoCliente_bairro_id_idx" ON "EnderecoCliente"("bairro_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EnderecoCliente_bairro_id_fkey'
  ) THEN
    ALTER TABLE "EnderecoCliente"
      ADD CONSTRAINT "EnderecoCliente_bairro_id_fkey"
      FOREIGN KEY ("bairro_id") REFERENCES "Bairros"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Controle por loja (painel) com vínculo ao bairro estruturado e ativação
ALTER TABLE "BairroTaxa" ADD COLUMN IF NOT EXISTS "bairro_id" TEXT;
ALTER TABLE "BairroTaxa" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "BairroTaxa_bairro_id_idx" ON "BairroTaxa"("bairro_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BairroTaxa_bairro_id_fkey'
  ) THEN
    ALTER TABLE "BairroTaxa"
      ADD CONSTRAINT "BairroTaxa_bairro_id_fkey"
      FOREIGN KEY ("bairro_id") REFERENCES "Bairros"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill básico de bairros a partir de endereços existentes
INSERT INTO "Bairros" ("id", "nome", "nome_normalizado", "cidade_id", "criado_por", "ativo")
SELECT
  md5(c.id || ':' || lower(trim(e.bairro)))::text as id,
  trim(e.bairro) as nome,
  lower(trim(translate(trim(e.bairro),
    'ÁÀÃÂÄáàãâäÉÊÈËéêèëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'))) as nome_normalizado,
  c.id as cidade_id,
  NULL as criado_por,
  true as ativo
FROM "EnderecoCliente" e
JOIN "Cidades" c ON lower(trim(c.nome)) = lower(trim(e.cidade))
WHERE trim(coalesce(e.bairro, '')) <> ''
ON CONFLICT ("cidade_id", "nome_normalizado") DO NOTHING;

-- Backfill de bairros vindos das taxas das lojas
INSERT INTO "Bairros" ("id", "nome", "nome_normalizado", "cidade_id", "criado_por", "ativo")
SELECT
  md5(c.id || ':' || lower(trim(bt.nome)))::text as id,
  trim(bt.nome) as nome,
  lower(trim(translate(trim(bt.nome),
    'ÁÀÃÂÄáàãâäÉÊÈËéêèëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'))) as nome_normalizado,
  c.id as cidade_id,
  NULL as criado_por,
  coalesce(bt.ativo, true) as ativo
FROM "BairroTaxa" bt
JOIN "Lojas" l ON l.id = bt.loja_id
JOIN "Cidades" c ON lower(trim(c.nome)) = lower(trim(l.cidade))
WHERE trim(coalesce(bt.nome, '')) <> ''
ON CONFLICT ("cidade_id", "nome_normalizado") DO NOTHING;

-- Vincula EnderecoCliente -> Bairros
UPDATE "EnderecoCliente" e
SET "bairro_id" = (
  SELECT b.id
  FROM "Cidades" c
  JOIN "Bairros" b ON b.cidade_id = c.id
  WHERE lower(trim(c.nome)) = lower(trim(e.cidade))
    AND b.nome_normalizado = lower(trim(translate(trim(e.bairro),
      'ÁÀÃÂÄáàãâäÉÊÈËéêèëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇç',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')))
  LIMIT 1
)
WHERE e."bairro_id" IS NULL
  AND trim(coalesce(e.bairro, '')) <> '';

-- Vincula BairroTaxa -> Bairros
UPDATE "BairroTaxa" bt
SET "bairro_id" = (
  SELECT b.id
  FROM "Lojas" l
  JOIN "Cidades" c ON lower(trim(c.nome)) = lower(trim(l.cidade))
  JOIN "Bairros" b ON b.cidade_id = c.id
  WHERE l.id = bt.loja_id
    AND b.nome_normalizado = lower(trim(translate(trim(bt.nome),
      'ÁÀÃÂÄáàãâäÉÊÈËéêèëÍÌÎÏíìîïÓÒÕÔÖóòõôöÚÙÛÜúùûüÇç',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')))
  LIMIT 1
)
WHERE bt."bairro_id" IS NULL
  AND trim(coalesce(bt.nome, '')) <> '';
