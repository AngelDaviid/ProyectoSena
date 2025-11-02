export interface Payload {
  sub: number; // User ID
  role: 'desarrollador' | 'instructor' | 'aprendiz';
}
