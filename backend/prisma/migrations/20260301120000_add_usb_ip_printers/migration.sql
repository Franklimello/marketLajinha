DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoImpressora') THEN
    CREATE TYPE "TipoImpressora" AS ENUM ('IP', 'USB');
  END IF;
END $$;

ALTER TABLE "Impressora"
  ADD COLUMN IF NOT EXISTS "type" "TipoImpressora" NOT NULL DEFAULT 'IP',
  ADD COLUMN IF NOT EXISTS "usb_identifier" TEXT;

ALTER TABLE "Impressora"
  ALTER COLUMN "ip" DROP NOT NULL;

ALTER TABLE "Impressora"
  ALTER COLUMN "porta" DROP NOT NULL;

ALTER TABLE "FilaImpressao"
  ADD COLUMN IF NOT EXISTS "impressora_tipo" "TipoImpressora" NOT NULL DEFAULT 'IP',
  ADD COLUMN IF NOT EXISTS "impressora_usb_identifier" TEXT NOT NULL DEFAULT '';

