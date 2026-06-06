import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';

export async function GET() {
  try {
    await connectMongoDB();
    const activities = await Activity.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: activities }, { status: 200 });
  } catch (error) {
    console.error('Error GET activities:', error);
    return NextResponse.json({ success: false, message: 'Gagal ambil data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, activityType, title, distance, duration, reps } = body;

    if (!username || !activityType || !title) {
      return NextResponse.json({ success: false, message: 'Mohon isi semua field wajib!' }, { status: 400 });
    }

    await connectMongoDB();

    let totalXP = 0;
    const nominal = Number(reps || 0);       // Input "Jumlah" (Nominal Reps)
    const tarikan = Number(duration || 0);   // Input "Reps" (Tarikan / Menit)
    const dist = Number(distance || 0);

    if (activityType === 'Lari') {
      totalXP = (dist * 50) + (tarikan * 5); // tarikan sbg menit
    } else if (activityType === 'Plank') {
      totalXP = tarikan * 15;                // tarikan sbg menit
    } else {
      // LOGIKA XP TERBALIK: 1x Tarikan = XP Gila!
      let multiplier = 5; // Default kalau dicicil 3x atau lebih
      
      if (tarikan <= 1) {
        multiplier = 20; // 1x Reps (Savage Mode)
      } else if (tarikan === 2) {
        multiplier = 10; // 2x Reps (Setengahnya)
      }

      totalXP = nominal * multiplier;
    }

    const newActivity = await Activity.create({
      username,
      activityType,
      title,
      distance: dist,
      duration: tarikan, 
      reps: nominal,      
      kudosCount: 0,
      earnedXP: totalXP
    });

    return NextResponse.json({ 
      success: true, 
      message: `Sesi olahraga berhasil disimpan! Lu dapet +${totalXP} XP.`, 
      data: newActivity 
    }, { status: 201 });

  } catch (error) {
    console.error('Error POST activities:', error);
    return NextResponse.json({ success: false, message: 'Gagal simpan data' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID aktivitas tidak valid' }, { status: 400 });
    }

    await connectMongoDB();
    
    const updatedActivity = await Activity.findByIdAndUpdate(
      id,
      { $inc: { kudosCount: 1 } },
      { new: true }
    );

    return NextResponse.json({ success: true, message: 'Kudos berhasil ditambah!', data: updatedActivity }, { status: 200 });
  } catch (error) {
    console.error('Error PUT kudos:', error);
    return NextResponse.json({ success: false, message: 'Gagal update data kudos' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID tidak ditemukan' }, { status: 400 });
    }

    await connectMongoDB();
    await Activity.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Aktivitas berhasil dihapus dari liga!' }, { status: 200 });
  } catch (error) {
    console.error('Error DELETE activity:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus data' }, { status: 500 });
  }
}