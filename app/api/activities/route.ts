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

    if (!username || !activityType || !title || !duration) {
      return NextResponse.json({ success: false, message: 'Mohon isi semua field wajib!' }, { status: 400 });
    }

    await connectMongoDB();

    let totalXP = 0;
    const dist = Number(distance || 0);
    const dur = Number(duration || 0);
    const rp = Number(reps || 0);

    if (activityType === 'Lari') {
      totalXP = (dist * 50) + (dur * 5);
    } else if (activityType === 'Plank') {
      totalXP = dur * 15;
    } else {
      totalXP = (rp * 10) + (dur * 2);
    }

    const newActivity = await Activity.create({
      username,
      activityType,
      title,
      distance: dist,
      duration: dur,
      reps: ['Push Up', 'Sit Up', 'Pull Up'].includes(activityType) ? rp : 0,
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

// FUNGSI BARU: HAPUS AKTIVITAS
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