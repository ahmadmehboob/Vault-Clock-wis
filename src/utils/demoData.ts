import { MediaItem, NoteItem, IntruderLog } from '../types/vault';

// Helper to create visually rich high-resolution PNG data URLs for vault photo items
function createSvgDataUrl(
  title: string,
  badge: string,
  gradientStart: string,
  gradientEnd: string,
  iconSymbol: string,
  subtext: string
): string {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1200, 800);
      grad.addColorStop(0, gradientStart);
      grad.addColorStop(1, gradientEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 800);

      // Background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 800);
        ctx.stroke();
      }
      for (let y = 0; y < 800; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // Central Icon circle
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(600, 310, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Emoji/Icon
      ctx.font = '64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iconSymbol, 600, 310);

      // Top Centered Pill Badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(470, 120, 260, 44, 22);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(badge, 600, 142);

      // Title & Subtext
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, 600, 470);

      ctx.font = '22px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(subtext, 600, 520);

      // Bottom encryption badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(410, 620, 380, 40, 8);
      ctx.fill();

      ctx.font = '13px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('AES-256 ENCRYPTED • HARDWARE ISOLATED', 600, 640);

      return canvas.toDataURL('image/png');
    }
  }
  return '';
}

// Generate a procedural video clip with moving shapes and timestamp on an in-memory canvas
export async function createProceduralVideoDataUrl(title: string, durationSeconds: number = 4): Promise<string> {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const stream = canvas.captureStream(30);
  let mediaRecorder: MediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  } catch {
    try {
      mediaRecorder = new MediaRecorder(stream);
    } catch {
      return '';
    }
  }

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
    let frame = 0;
    const totalFrames = durationSeconds * 30;

    const interval = setInterval(() => {
      frame++;
      const t = frame / totalFrames;
      // Draw background
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }
      for (let y = 0; y < 360; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Draw animated radar pulse
      const radius = ((frame * 2.5) % 180) + 10;
      ctx.beginPath();
      ctx.arc(320, 160, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 1 - radius / 180)})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw center secure icon
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(320, 160, 32, 0, Math.PI * 2);
      ctx.fill();

      // Progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(40, 310, 560, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(40, 310, 560 * t, 6);

      // HUD Text
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(title, 320, 230);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`SECURE PLAYBACK • ${((frame / 30)).toFixed(1)}s / ${durationSeconds}s • 1080p VAULT REC`, 320, 260);

      if (frame >= totalFrames) {
        clearInterval(interval);
        mediaRecorder.stop();
      }
    }, 1000 / 30);
  });
}

export function getInitialMasterMedia(): MediaItem[] {
  const now = Date.now();
  return [
    {
      id: 'photo_passports',
      type: 'photo',
      title: 'Passports & International Visas',
      dataUrl: createSvgDataUrl(
        'US & EU Biometric Passports',
        'CONFIDENTIAL ID',
        '#0f172a',
        '#1e293b',
        '🛂',
        'Family ID scan backup & official renewal visas'
      ),
      sizeBytes: 842000,
      mimeType: 'image/svg+xml',
      createdAt: now - 86400000 * 3,
      updatedAt: now - 86400000 * 3,
      favorite: true,
      album: 'Passports & Documents',
      tags: ['identity', 'travel', 'backup'],
      width: 1200,
      height: 800,
      isEncrypted: true,
    },
    {
      id: 'photo_crypto_seed',
      type: 'photo',
      title: 'Cold Storage Recovery Seed Phrase',
      dataUrl: createSvgDataUrl(
        '24-Word Mnemonic Vault Card',
        'FINANCIAL VAULT',
        '#1c1917',
        '#292524',
        '🔑',
        'Hardware ledger titanium card backup - DO NOT SHARE'
      ),
      sizeBytes: 615000,
      mimeType: 'image/svg+xml',
      createdAt: now - 86400000 * 6,
      updatedAt: now - 86400000 * 6,
      favorite: true,
      album: 'Financial & Crypto',
      tags: ['crypto', 'private-keys', 'critical'],
      width: 1200,
      height: 800,
      isEncrypted: true,
    },
    {
      id: 'photo_medical_records',
      type: 'photo',
      title: 'Confidential Health & Lab Panel 2026',
      dataUrl: createSvgDataUrl(
        'Comprehensive Bio-Diagnostics',
        'MEDICAL ENCRYPTED',
        '#064e3b',
        '#022c22',
        '🩺',
        'Blood chemistry, allergy charts, emergency blood type'
      ),
      sizeBytes: 940000,
      mimeType: 'image/svg+xml',
      createdAt: now - 86400000 * 12,
      updatedAt: now - 86400000 * 12,
      favorite: false,
      album: 'Personal & Health',
      tags: ['health', 'emergency'],
      width: 1200,
      height: 800,
      isEncrypted: true,
    },
    {
      id: 'photo_vacation_alps',
      type: 'photo',
      title: 'Private Chalet Getaway - Swiss Alps',
      dataUrl: createSvgDataUrl(
        'Matterhorn Summit Sunset',
        'MEMORIES',
        '#1e1b4b',
        '#312e81',
        '🏔️',
        'Hidden family cabin coordinates & private album'
      ),
      sizeBytes: 1240000,
      mimeType: 'image/svg+xml',
      createdAt: now - 86400000 * 18,
      updatedAt: now - 86400000 * 18,
      favorite: true,
      album: 'Personal & Health',
      tags: ['vacation', 'private', 'family'],
      width: 1200,
      height: 800,
      isEncrypted: true,
    },
  ];
}

export function getInitialDecoyMedia(): MediaItem[] {
  const now = Date.now();
  return [
    {
      id: 'decoy_cat',
      type: 'photo',
      title: 'Cute Oliver Cat Sleeping',
      dataUrl: createSvgDataUrl(
        'Oliver the Tabby Cat',
        'PET ALBUM',
        '#451a03',
        '#78350f',
        '🐱',
        'Sleeping on the sunny living room rug'
      ),
      sizeBytes: 320000,
      mimeType: 'image/svg+xml',
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 2,
      favorite: true,
      album: 'General',
      tags: ['pets'],
      width: 1200,
      height: 800,
      isEncrypted: false,
    },
    {
      id: 'decoy_recipe',
      type: 'photo',
      title: 'Grandma Homemade Apple Pie',
      dataUrl: createSvgDataUrl(
        'Apple Pie Recipe',
        'COOKBOOK',
        '#14532d',
        '#166534',
        '🥧',
        'Cinnamon, brown sugar, flaky butter crust'
      ),
      sizeBytes: 410000,
      mimeType: 'image/svg+xml',
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000 * 5,
      favorite: false,
      album: 'General',
      tags: ['recipes'],
      width: 1200,
      height: 800,
      isEncrypted: false,
    },
  ];
}

export function getInitialMasterNotes(): NoteItem[] {
  const now = Date.now();
  return [
    {
      id: 'note_wifi_passwords',
      title: 'Home & Office Encrypted Access Codes',
      content: `### Penthouse High-Speed Mesh
- **SSID:** CyberSecure_5G_Private
- **WPA3 Key:** \`Krypt0n-Vault-8849!x#\`
- **Router Admin:** \`192.168.1.1\` (User: \`admin\` / Pwd: \`TitaniumShield99$\`)

### Safe & Gate Lock Codes
- Front Gate Intercom: \`#7732\`
- Gun & Document Biometric Safe: Master override key in hidden desk false bottom`,
      color: 'slate',
      pinned: true,
      category: 'Passwords',
      tags: ['wifi', 'security', 'home'],
      checklist: [
        { id: '1', text: 'Rotate Wi-Fi router WPA3 keys quarterly', done: true },
        { id: '2', text: 'Verify smoke detector backup battery', done: false },
      ],
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000 * 1,
      isEncrypted: true,
    },
    {
      id: 'note_offshore_banking',
      title: 'Emergency Liquid Accounts & Banking Numbers',
      content: `### Primary Private Wealth Advisory
- **Institution:** Zurich Private Bank AG
- **IBAN:** \`CH93 0076 2011 6238 5291 0\`
- **SWIFT / BIC:** \`ZURICHCHZZ\`
- **Relationship Manager:** Hans V. (+41 44 212 9000)

*Note: Wire releases over $50k require telephone verbal passphrase: "Starlight Protocol 44".*`,
      color: 'emerald',
      pinned: true,
      category: 'Financial',
      tags: ['bank', 'wire', 'emergency'],
      createdAt: now - 86400000 * 7,
      updatedAt: now - 86400000 * 3,
      isEncrypted: true,
    },
    {
      id: 'note_personal_journal',
      title: 'Reflections & Executive Vision 2026',
      content: `The secret to lasting peace of mind is simplicity and ruthless focus on privacy. Keep our family affairs sovereign, invest in tangible security, and preserve what truly matters.
Never share private encryption keys across unverified networks.`,
      color: 'indigo',
      pinned: false,
      category: 'Personal',
      tags: ['journal', 'thoughts'],
      createdAt: now - 86400000 * 14,
      updatedAt: now - 86400000 * 14,
      isEncrypted: true,
    },
  ];
}

export function getInitialDecoyNotes(): NoteItem[] {
  const now = Date.now();
  return [
    {
      id: 'decoy_groceries',
      title: 'Weekend Grocery & Hardware List',
      content: `- 2% Organic Oat Milk\n- Sourdough Bread\n- Avocados (ripe)\n- Olive oil (Extra Virgin)\n- Light bulbs (Warm White 2700K)\n- Fresh basil & rosemary`,
      color: 'amber',
      pinned: true,
      category: 'General',
      tags: ['shopping'],
      checklist: [
        { id: '1', text: 'Oat milk', done: true },
        { id: '2', text: 'Avocados', done: false },
        { id: '3', text: 'Olive oil', done: false },
      ],
      createdAt: now - 86400000 * 1,
      updatedAt: now - 86400000 * 1,
      isEncrypted: false,
    },
  ];
}

export function getInitialIntruderLogs(): IntruderLog[] {
  const now = Date.now();
  return [
    {
      id: 'log_mock_1',
      timestamp: now - 3600000 * 5,
      enteredInput: '0000=',
      reason: 'Incorrect PIN entered on calculator keypad',
    },
    {
      id: 'log_mock_2',
      timestamp: now - 3600000 * 24,
      enteredInput: '8888=',
      reason: 'Failed secret passcode sequence attempt',
    },
  ];
}
