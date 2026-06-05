import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import Activity from '@/models/Activity'; // Pastikan path model lu bener

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
    await connectMongoDB();
    const newActivity = await Activity.create(body);
    return NextResponse.json({ success: true, message: 'Data tersimpan!', data: newActivity }, { status: 201 });
  } catch (error) {
    console.error('Error POST activities:', error);
    return NextResponse.json({ success: false, message: 'Gagal simpan data' }, { status: 500 });
  }
}