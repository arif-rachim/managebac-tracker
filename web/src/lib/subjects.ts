// No canonical 14-class registry exists in ManageBac's student feed — subject
// identity is inferred from detail.className / notification origin. This seeds
// the known class IDs (discovered via API recon) and assigns each a stable
// colour so a subject looks the same everywhere in the UI.

export interface Subject {
  classId: string;
  label: string; // short human name
  hue: number; // 0-360, drives the chip colour
}

const SEED: Record<string, string> = {
  '12880206': 'Digital Design',
  '12880214': 'English',
  '12880222': 'Perancis',
  '12880222x': 'Perancis',
  '12880248': 'Media Arts',
  '12880236': 'Visual Art',
  '12880273': 'Science',
  '12880286': 'Theatre',
  '12880264': 'PE',
  '12880295': 'Arabic',
  '12880235': 'Islamic',
  '12880227': 'Individuals & Societies',
  '12925270': 'Community Project',
};

// deterministic hue from a class id so unseen subjects still get a stable colour
function hueFor(classId: string): number {
  let h = 0;
  for (let i = 0; i < classId.length; i++) h = (h * 31 + classId.charCodeAt(i)) % 360;
  return h;
}

export function subjectFor(classId: string | null | undefined, className?: string | null): Subject {
  const id = classId || 'unknown';
  const label =
    SEED[id] ||
    (className
      ? className.replace(/IB MYP Y?9?\s*/i, '').replace(/\(Year 9\)/i, '').replace(/\/.*$/, '').trim().slice(0, 22)
      : 'Lainnya');
  return { classId: id, label, hue: hueFor(id) };
}

// pastel-ish background + readable foreground derived from the hue
export function subjectStyle(hue: number, dark = false): { bg: string; fg: string; dot: string } {
  return dark
    ? { bg: `hsl(${hue} 40% 20%)`, fg: `hsl(${hue} 70% 82%)`, dot: `hsl(${hue} 65% 65%)` }
    : { bg: `hsl(${hue} 70% 94%)`, fg: `hsl(${hue} 55% 32%)`, dot: `hsl(${hue} 60% 48%)` };
}
