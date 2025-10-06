-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "liked" TEXT NOT NULL,
    "disliked" TEXT NOT NULL,
    "bug" TEXT NOT NULL,
    "navigation" TEXT NOT NULL,
    "recommend" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "usability" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);
