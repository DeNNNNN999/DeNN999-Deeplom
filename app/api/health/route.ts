import { NextRequest, NextResponse } from 'next/server';

/**
 * Маршрут для проверки состояния сервера API
 * Используется для быстрой проверки доступности сервера без нагрузки на GraphQL
 */
export async function GET(request: NextRequest) {
  try {
    // Дополнительная проверка подключения к базе данных и Redis может быть добавлена здесь
    
    return NextResponse.json({
      status: 'ok',
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Service is experiencing issues'
    }, { status: 500 });
  }
}
