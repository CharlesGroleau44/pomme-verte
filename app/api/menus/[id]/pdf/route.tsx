// app/api/menus/[id]/pdf/route.ts
// Version PDF brandée d'un menu — pour les parents qui ne peuvent pas
// commander en ligne. Accessible SANS connexion (voir middleware.ts)
// mais seulement si le menu est visible (estMenuVisible — voir
// lib/menu-logic.ts, distinct de la date limite de commande depuis le
// 8 septembre 2026) ; l'équipe (admin connectée) peut toujours la
// prévisualiser, même en brouillon.
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { PHOTOS_DIR } from '@/lib/photos';
import { estMenuVisible } from '@/lib/menu-logic';
import { sessionValide } from '@/lib/session';
import MenuDocument, { type PhotoResolue } from '@/lib/pdf/MenuDocument';

export const dynamic = 'force-dynamic';

// Les photos de repas sont téléversées à pleine résolution (parfois
// plusieurs Mo) pour un usage web ; dans le PDF elles ne s'affichent
// jamais à plus de ~35pt. Sans redimensionnement, un menu de 10 photos
// produisait un PDF de 15-20 Mo. On redimensionne donc systématiquement
// avant d'embarquer dans le document (toujours réencodé en JPEG — plus
// petit que le PNG pour une photo, et react-pdf n'a besoin que de
// jpg/png de toute façon).
async function redimensionnerPourPdf(data: Buffer, cote: number, mode: 'cover' | 'contenu'): Promise<PhotoResolue> {
  try {
    const jpeg = await sharp(data)
      .resize(cote, cote, { fit: mode === 'cover' ? 'cover' : 'inside' })
      .flatten({ background: '#FFFFFF' }) // aplati sur fond blanc — un logo PNG transparent ne doit pas virer noir en JPEG
      .jpeg({ quality: 78 })
      .toBuffer();
    return { data: jpeg, format: 'jpg' };
  } catch {
    return null;
  }
}

// mode 'cover' (photos de repas, déjà affichées recadrées partout
// ailleurs dans l'app) vs 'contenu' (logos — jamais recadrés, voir la
// correction du même problème sur les pages publiques /menus).
async function resoudrePhoto(url: string | null, cote: number, mode: 'cover' | 'contenu' = 'cover'): Promise<PhotoResolue> {
  if (!url) return null;
  const nomFichier = url.split('/').pop();
  if (!nomFichier) return null;
  try {
    const data = await readFile(path.join(PHOTOS_DIR, nomFichier));
    return await redimensionnerPourPdf(data, cote, mode);
  } catch {
    return null;
  }
}

async function estAdminConnecte(req: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret-non-securise';
  const jeton = req.cookies.get('pv_session')?.value;
  return (await sessionValide(jeton, secret)) !== null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const menu = await prisma.menu.findUnique({
    where: { id: params.id },
    include: {
      institution: true,
      thematiqueRef: true,
      journees: {
        include: { selections: { include: { repas: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!menu) return NextResponse.json({ error: 'Menu introuvable.' }, { status: 404 });

  const accesAutorise = (await estAdminConnecte(req)) || estMenuVisible(menu);
  if (!accesAutorise) {
    return NextResponse.json({ error: 'Ce menu n\'est pas publié.' }, { status: 404 });
  }

  const [logoTraiteur, logoInstitution] = await Promise.all([
    readFile(path.join(process.cwd(), 'public', 'logo.jpeg'))
      .then((data) => redimensionnerPourPdf(data, 120, 'contenu'))
      .catch(() => null),
    resoudrePhoto(menu.institution.logoUrl, 200, 'contenu'),
  ]);

  const journees = await Promise.all(
    menu.journees.map(async (j) => ({
      id: j.id,
      date: j.date,
      jourSemaine: j.jourSemaine,
      selections: await Promise.all(
        j.selections.map(async (s) => ({
          id: s.id,
          nom: s.nomOverride ?? s.repas.nom,
          description: s.descriptionOverride ?? s.repas.description,
          photo: await resoudrePhoto(s.photoUrlOverride ?? s.repas.photoUrl, 100),
          prixPetit: (s.prixPetitOverride ?? s.repas.prixPetit).toString(),
          prixRegulier: (s.prixRegulierOverride ?? s.repas.prixRegulier).toString(),
          prixDeuxiemeService: (s.prixDeuxiemeServiceOverride ?? s.repas.prixDeuxiemeService).toString(),
        }))
      ),
    }))
  );

  // req.url reflète l'adresse interne vue par le serveur Node derrière
  // Caddy (ex. http://0.0.0.0:3006), jamais le domaine public — SITE_URL
  // est donc la source de vérité en production ; le repli sur l'origine
  // de la requête ne sert qu'en développement local, où SITE_URL n'est
  // pas défini.
  const origine = process.env.SITE_URL ?? new URL(req.url).origin;
  const urlEnLigne = `${origine}/menus/${menu.institutionId}/${menu.id}`;

  const buffer = await renderToBuffer(
    <MenuDocument
      thematique={menu.thematiqueRef?.nom ?? null}
      periodeDebut={menu.periodeDebut}
      periodeFin={menu.periodeFin}
      dateLimiteCommande={menu.dateLimiteCommande}
      urlEnLigne={urlEnLigne}
      institution={{
        nom: menu.institution.nom, telephone: menu.institution.telephone, courriel: menu.institution.courriel, logo: logoInstitution,
        offreFondation: menu.institution.offreFondation, offreFormatPetit: menu.institution.offreFormatPetit,
        prixRepasDepannage: menu.institution.prixRepasDepannage?.toFixed(2) ?? null,
        politiques: menu.institution.politiques,
      }}
      logoTraiteur={logoTraiteur}
      journees={journees}
    />
  );

  const nomFichier = `menu-${menu.institution.nom.replace(/[^a-z0-9]+/gi, '-')}-${menu.id.slice(-6)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomFichier}"`,
    },
  });
}
