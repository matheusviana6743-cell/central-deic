export function GET() {
  return Response.json({ service: 'central-deic', status: 'ok', database: Boolean(process.env.DATABASE_URL) });
}
