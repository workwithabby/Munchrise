export interface TeamMember {
  name: string;
  role: string;
  photo: string;
}

/** Shown on the Developers page. */
export const DEVELOPERS: TeamMember[] = [
  { name: 'Dela Cruz, Abigail B.', role: 'Group Leader', photo: 'assets/developers/abigail.jpg' },
  { name: 'Crisostomo, John Steven G.', role: 'Member', photo: 'assets/developers/john-steven.jpg' },
  { name: 'Albaran, John Jeriel', role: 'Member', photo: 'assets/developers/john-jeriel.png' },
  { name: 'Atanacio, Alirah Jireh S.', role: 'Member', photo: 'assets/developers/alirah.jpg' },
  { name: 'Remegio, Nicole Angela C.', role: 'Member', photo: 'assets/developers/nicole-angela.jpg' },
];

export const CLASS_INFO =
  'IT 005 – Integrative Programming and Technologies • BSIT IT31S6 • Technological Institute of the Philippines, Quezon City • Prof. Dr. Daisy-ann Y. Santos';
