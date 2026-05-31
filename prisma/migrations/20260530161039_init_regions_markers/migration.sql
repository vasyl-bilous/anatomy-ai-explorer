-- CreateEnum
CREATE TYPE "RegionScreen" AS ENUM ('body', 'brain');

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "screen" "RegionScreen" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "parent_id" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markers" (
    "id" TEXT NOT NULL,
    "x_pct" DOUBLE PRECISION NOT NULL,
    "y_pct" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "tooltip" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,

    CONSTRAINT "markers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regions_screen_idx" ON "regions"("screen");

-- CreateIndex
CREATE INDEX "regions_parent_id_idx" ON "regions"("parent_id");

-- CreateIndex
CREATE INDEX "markers_region_id_idx" ON "markers"("region_id");

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markers" ADD CONSTRAINT "markers_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
