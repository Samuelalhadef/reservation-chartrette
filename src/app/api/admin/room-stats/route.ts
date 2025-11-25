import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { reservations, rooms, associations } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    // Calculer les dates de début et fin de l'année
    const startDate = new Date(`${year}-01-01T00:00:00`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    if (roomId) {
      // Détail pour une salle spécifique : heures par association
      const roomReservations = await db
        .select({
          id: reservations.id,
          timeSlots: reservations.timeSlots,
          status: reservations.status,
          associationId: associations.id,
          associationName: associations.name,
        })
        .from(reservations)
        .leftJoin(associations, eq(reservations.associationId, associations.id))
        .where(
          and(
            eq(reservations.roomId, roomId),
            gte(reservations.date, startDate),
            lte(reservations.date, endDate),
            inArray(reservations.status, ['approved', 'pending'])
          )
        );

      // Calculer les heures par association
      const associationStats: { [key: string]: { name: string; hours: number; reservations: number } } = {};

      for (const reservation of roomReservations) {
        const timeSlots = reservation.timeSlots as any[] || [];
        let hours = 0;

        // Calculer le nombre d'heures pour cette réservation
        for (const slot of timeSlots) {
          const startHour = parseInt(slot.start.split(':')[0]);
          const endHour = parseInt(slot.end.split(':')[0]);
          hours += endHour - startHour;
        }

        const assocId = reservation.associationId || 'unknown';
        const assocName = reservation.associationName || 'Sans association';

        if (!associationStats[assocId]) {
          associationStats[assocId] = { name: assocName, hours: 0, reservations: 0 };
        }

        associationStats[assocId].hours += hours;
        associationStats[assocId].reservations += 1;
      }

      // Convertir en tableau et trier par heures
      const associationList = Object.entries(associationStats)
        .map(([id, data]) => ({
          associationId: id,
          associationName: data.name,
          hours: data.hours,
          reservations: data.reservations,
        }))
        .sort((a, b) => b.hours - a.hours);

      return NextResponse.json(
        {
          year: parseInt(year),
          roomId,
          associations: associationList,
          totalHours: associationList.reduce((sum, a) => sum + a.hours, 0),
        },
        { status: 200 }
      );
    } else {
      // Statistiques globales : toutes les salles avec heures totales
      // 1. Récupérer toutes les salles actives
      const allRooms = await db
        .select({
          id: rooms.id,
          name: rooms.name,
        })
        .from(rooms)
        .where(eq(rooms.isActive, true));

      // 2. Récupérer toutes les réservations de l'année
      const allReservations = await db
        .select({
          roomId: reservations.roomId,
          timeSlots: reservations.timeSlots,
        })
        .from(reservations)
        .where(
          and(
            gte(reservations.date, startDate),
            lte(reservations.date, endDate),
            inArray(reservations.status, ['approved', 'pending'])
          )
        );

      // 3. Calculer les heures par salle
      const roomStats: { [key: string]: { name: string; hours: number; reservations: number } } = {};

      // Initialiser toutes les salles
      for (const room of allRooms) {
        roomStats[room.id] = { name: room.name, hours: 0, reservations: 0 };
      }

      // Calculer les heures
      for (const reservation of allReservations) {
        if (roomStats[reservation.roomId]) {
          const timeSlots = reservation.timeSlots as any[] || [];
          let hours = 0;

          for (const slot of timeSlots) {
            const startHour = parseInt(slot.start.split(':')[0]);
            const endHour = parseInt(slot.end.split(':')[0]);
            hours += endHour - startHour;
          }

          roomStats[reservation.roomId].hours += hours;
          roomStats[reservation.roomId].reservations += 1;
        }
      }

      // Convertir en tableau et trier par heures
      const roomList = Object.entries(roomStats)
        .map(([id, data]) => ({
          roomId: id,
          roomName: data.name,
          hours: data.hours,
          reservations: data.reservations,
        }))
        .sort((a, b) => b.hours - a.hours);

      return NextResponse.json(
        {
          year: parseInt(year),
          rooms: roomList,
          totalHours: roomList.reduce((sum, r) => sum + r.hours, 0),
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Get room stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const year = body.year || new Date().getFullYear().toString();

    // Calculer les dates de début et fin de l'année
    const startDate = new Date(`${year}-01-01T00:00:00`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    // 1. Récupérer toutes les salles actives
    const allRooms = await db
      .select({
        id: rooms.id,
        name: rooms.name,
      })
      .from(rooms)
      .where(eq(rooms.isActive, true));

    // 2. Récupérer toutes les associations actives
    const allAssociations = await db
      .select({
        id: associations.id,
        name: associations.name,
      })
      .from(associations)
      .where(eq(associations.status, 'active'));

    // 3. Récupérer toutes les réservations de l'année
    const allReservations = await db
      .select({
        roomId: reservations.roomId,
        associationId: reservations.associationId,
        timeSlots: reservations.timeSlots,
      })
      .from(reservations)
      .where(
        and(
          gte(reservations.date, startDate),
          lte(reservations.date, endDate),
          inArray(reservations.status, ['approved', 'pending'])
        )
      );

    // 4. Créer une matrice : association x salle -> heures
    const matrix: { [associationId: string]: { [roomId: string]: number } } = {};

    // Initialiser la matrice pour toutes les associations
    for (const assoc of allAssociations) {
      matrix[assoc.id] = {};
      for (const room of allRooms) {
        matrix[assoc.id][room.id] = 0;
      }
    }

    // Ajouter une catégorie spéciale pour les comptes non associés
    const nonAssociatedKey = 'NON_ASSOCIATED';
    matrix[nonAssociatedKey] = {};
    for (const room of allRooms) {
      matrix[nonAssociatedKey][room.id] = 0;
    }

    // Remplir la matrice avec les heures
    for (const reservation of allReservations) {
      const timeSlots = reservation.timeSlots as any[] || [];
      let hours = 0;

      for (const slot of timeSlots) {
        const startHour = parseInt(slot.start.split(':')[0]);
        const endHour = parseInt(slot.end.split(':')[0]);
        hours += endHour - startHour;
      }

      // Vérifier si la réservation est associée à une association connue
      if (reservation.associationId && matrix[reservation.associationId]) {
        if (matrix[reservation.associationId][reservation.roomId] !== undefined) {
          matrix[reservation.associationId][reservation.roomId] += hours;
        }
      } else {
        // Réservation sans association ou association inconnue
        if (matrix[nonAssociatedKey][reservation.roomId] !== undefined) {
          matrix[nonAssociatedKey][reservation.roomId] += hours;
        }
      }
    }

    // 5. Créer le tableau Excel avec en-têtes
    const excelData: (string | number)[][] = [];

    // En-tête : première colonne = "Association", puis les noms des salles
    const header: (string | number)[] = ['Association', ...allRooms.map(room => room.name), 'TOTAL'];
    excelData.push(header);

    // Lignes : chaque association avec ses heures par salle
    for (const assoc of allAssociations) {
      const row: (string | number)[] = [assoc.name];
      let totalHoursForAssoc = 0;

      for (const room of allRooms) {
        const hours = matrix[assoc.id][room.id] || 0;
        row.push(hours);
        totalHoursForAssoc += hours;
      }

      row.push(totalHoursForAssoc);
      excelData.push(row);
    }

    // Ajouter la ligne pour les comptes non associés
    const nonAssociatedRow: (string | number)[] = ['Comptes non associés'];
    let totalHoursNonAssociated = 0;

    for (const room of allRooms) {
      const hours = matrix[nonAssociatedKey][room.id] || 0;
      nonAssociatedRow.push(hours);
      totalHoursNonAssociated += hours;
    }

    nonAssociatedRow.push(totalHoursNonAssociated);

    // N'ajouter cette ligne que si elle contient des heures
    if (totalHoursNonAssociated > 0) {
      excelData.push(nonAssociatedRow);
    }

    // Ligne totale : total des heures par salle
    const totalRow: (string | number)[] = ['TOTAL'];
    let grandTotal = 0;

    for (const room of allRooms) {
      let totalHoursForRoom = 0;
      for (const assoc of allAssociations) {
        totalHoursForRoom += matrix[assoc.id][room.id] || 0;
      }
      // Ajouter les heures des comptes non associés
      totalHoursForRoom += matrix[nonAssociatedKey][room.id] || 0;

      totalRow.push(totalHoursForRoom);
      grandTotal += totalHoursForRoom;
    }

    totalRow.push(grandTotal);
    excelData.push(totalRow);

    // 6. Créer le fichier Excel avec styles
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Définir la largeur des colonnes
    const colWidths = [{ wch: 30 }]; // Colonne Association plus large
    for (let i = 0; i < allRooms.length; i++) {
      colWidths.push({ wch: 15 }); // Colonnes des salles
    }
    colWidths.push({ wch: 12 }); // Colonne TOTAL
    worksheet['!cols'] = colWidths;

    // Palette de couleurs pastel pour les lignes d'associations
    const colorPalette = [
      "E6F3FF", // Bleu clair
      "FFE6F0", // Rose clair
      "E6FFE6", // Vert clair
      "FFF4E6", // Orange clair
      "F0E6FF", // Violet clair
      "E6FFFF", // Cyan clair
      "FFFFE6", // Jaune clair
      "FFE6E6", // Rouge clair
      "E6F0FF", // Bleu-gris clair
      "F5E6FF", // Lavande clair
      "E6FFE9", // Vert menthe clair
      "FFE9E6", // Pêche clair
      "E6EDFF", // Pervenche clair
      "FFEEF0", // Rose pâle
      "F0FFE6", // Vert lime clair
    ];

    // Appliquer des styles aux cellules
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];

        if (!cell) continue;

        // Initialiser le style
        if (!cell.s) cell.s = {};

        // Style pour l'en-tête (première ligne)
        if (R === 0) {
          cell.s = {
            fill: { fgColor: { rgb: "2E5090" } }, // Bleu foncé profond
            font: { color: { rgb: "FFFFFF" }, bold: true, sz: 13 },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "medium", color: { rgb: "000000" } },
              right: { style: "medium", color: { rgb: "000000" } }
            }
          };
        }
        // Style pour la ligne TOTAL (dernière ligne)
        else if (R === range.e.r) {
          cell.s = {
            fill: { fgColor: { rgb: "2E7D32" } }, // Vert foncé
            font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
            alignment: { horizontal: C === 0 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "medium", color: { rgb: "000000" } },
              right: { style: "medium", color: { rgb: "000000" } }
            }
          };
        }
        // Style pour la ligne "Comptes non associés" (avant-dernière ligne si elle existe)
        else if (totalHoursNonAssociated > 0 && R === range.e.r - 1) {
          cell.s = {
            fill: { fgColor: { rgb: "FF9800" } }, // Orange vif
            font: { color: { rgb: "000000" }, bold: true, sz: 11 },
            alignment: { horizontal: C === 0 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "medium", color: { rgb: "000000" } },
              right: { style: "medium", color: { rgb: "000000" } }
            }
          };
        }
        // Style pour les lignes d'associations (avec couleurs variées)
        else {
          // Choisir une couleur de la palette en fonction de la ligne
          const colorIndex = (R - 1) % colorPalette.length;
          const rowColor = colorPalette[colorIndex];

          cell.s = {
            fill: { fgColor: { rgb: rowColor } },
            font: { color: { rgb: "000000" }, sz: 10 },
            alignment: { horizontal: C === 0 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "B0B0B0" } },
              bottom: { style: "thin", color: { rgb: "B0B0B0" } },
              left: { style: "thin", color: { rgb: "B0B0B0" } },
              right: { style: "thin", color: { rgb: "B0B0B0" } }
            }
          };

          // Mettre en gras la première colonne (noms des associations)
          if (C === 0) {
            cell.s.font.bold = true;
            cell.s.font.sz = 11;
          }

          // Mettre en gras et colorer différemment la colonne TOTAL
          if (C === range.e.c) {
            cell.s.font.bold = true;
            cell.s.font.sz = 11;
            // Utiliser une version plus foncée de la couleur de la ligne
            const darkerColors: { [key: string]: string } = {
              "E6F3FF": "B3D9FF",
              "FFE6F0": "FFB3D9",
              "E6FFE6": "B3FFB3",
              "FFF4E6": "FFE0B3",
              "F0E6FF": "D1B3FF",
              "E6FFFF": "B3FFFF",
              "FFFFE6": "FFFFB3",
              "FFE6E6": "FFB3B3",
              "E6F0FF": "B3D1FF",
              "F5E6FF": "E0B3FF",
              "E6FFE9": "B3FFD1",
              "FFE9E6": "FFD1B3",
              "E6EDFF": "B3C8FF",
              "FFEEF0": "FFD6DD",
              "F0FFE6": "D9FFB3",
            };
            cell.s.fill = { fgColor: { rgb: darkerColors[rowColor] || rowColor } };
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Statistiques ${year}`);

    // Générer le fichier Excel en buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Retourner le fichier Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="statistiques_salles_${year}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Export Excel error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
