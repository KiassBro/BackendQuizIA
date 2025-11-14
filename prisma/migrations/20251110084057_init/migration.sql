-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ETUDIANT', 'ENSEIGNANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "Niveau" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE');

-- CreateEnum
CREATE TYPE "TypeQuestion" AS ENUM ('QCM', 'VRAI_FAUX', 'TEXTE_COURT', 'TEXTE_LONG');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ETUDIANT',
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "createurId" TEXT NOT NULL,
    "theme" TEXT,
    "niveau" "Niveau" NOT NULL DEFAULT 'INTERMEDIAIRE',
    "duree" INTEGER,
    "estPublic" BOOLEAN NOT NULL DEFAULT true,
    "estGenereParIA" BOOLEAN NOT NULL DEFAULT false,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "type" "TypeQuestion" NOT NULL,
    "options" JSONB,
    "reponseCorrecte" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "explication" TEXT,
    "estGenereeParIA" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentatives" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "scoreTotal" DOUBLE PRECISION,
    "estTermine" BOOLEAN NOT NULL DEFAULT false,
    "feedbackGlobal" TEXT,

    CONSTRAINT "tentatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponse_utilisateurs" (
    "id" TEXT NOT NULL,
    "tentativeId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reponseDonnee" JSONB NOT NULL,
    "estCorrecte" BOOLEAN,
    "scoreObtenu" DOUBLE PRECISION,
    "feedbackIA" TEXT,

    CONSTRAINT "reponse_utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_ais" (
    "id" TEXT NOT NULL,
    "typeAction" TEXT NOT NULL,
    "promptEnvoye" TEXT NOT NULL,
    "reponseIA" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "coutTokens" INTEGER,
    "dateAppel" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_ais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentatives" ADD CONSTRAINT "tentatives_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentatives" ADD CONSTRAINT "tentatives_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_utilisateurs" ADD CONSTRAINT "reponse_utilisateurs_tentativeId_fkey" FOREIGN KEY ("tentativeId") REFERENCES "tentatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_utilisateurs" ADD CONSTRAINT "reponse_utilisateurs_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_ais" ADD CONSTRAINT "prompt_ais_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
