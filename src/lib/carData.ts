// Lists that turn typing into tapping in the owner's form.

export const MAKES: Record<string, string[]> = {
  Toyota: ['Premio', 'Allion', 'Harrier', 'Land Cruiser', 'Land Cruiser Prado', 'RAV4', 'Noah', 'Voxy', 'Wish', 'Corolla', 'Fielder', 'Axio', 'Mark X', 'Crown', 'Hilux', 'Hiace', 'Vitz', 'Passo', 'Ractis', 'Spacio', 'Ist', 'Rumion', 'Sienta', 'Alphard', 'Vanguard', 'Kluger', 'Fortuner', 'Probox', 'Succeed', 'Camry', 'Aqua', 'Prius', 'C-HR', 'Rush', 'Belta'],
  Subaru: ['Forester', 'Impreza', 'Legacy', 'Outback', 'XV', 'Exiga', 'Levorg'],
  Nissan: ['X-Trail', 'Note', 'March', 'Tiida', 'Sylphy', 'Navara', 'Patrol', 'Juke', 'Dualis', 'Murano', 'Caravan', 'Wingroad', 'Serena'],
  Mitsubishi: ['Pajero', 'Outlander', 'RVR', 'Galant', 'Lancer', 'L200', 'Canter', 'Delica'],
  Honda: ['Fit', 'CR-V', 'Vezel', 'Stream', 'Civic', 'Accord', 'Freed', 'Airwave', 'Insight'],
  Mazda: ['Demio', 'Axela', 'Atenza', 'CX-5', 'CX-3', 'Premacy', 'Bongo', 'Verisa'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'ML', 'G-Class', 'Sprinter'],
  BMW: ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6'],
  Volkswagen: ['Golf', 'Polo', 'Passat', 'Tiguan', 'Touareg', 'Amarok'],
  Lexus: ['RX', 'LX', 'GX', 'IS', 'ES', 'NX'],
  'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Discovery', 'Defender', 'Freelander'],
  Isuzu: ['D-Max', 'MU-X', 'Elf', 'Forward', 'Trooper'],
  Suzuki: ['Swift', 'Escudo', 'Vitara', 'Jimny', 'Every', 'Carry', 'Alto'],
  Ford: ['Ranger', 'Everest', 'Escape', 'Explorer', 'Ecosport'],
  Hyundai: ['Tucson', 'Santa Fe', 'Elantra', 'Accent', 'H-1'],
  Kia: ['Sportage', 'Sorento', 'Picanto', 'Rio'],
  Audi: ['A4', 'A6', 'Q5', 'Q7'],
  Peugeot: ['3008', '5008', '508', '2008'],
  Daihatsu: ['Mira', 'Move', 'Terios', 'Hijet'],
}

export const FUELS = ['petrol', 'diesel', 'hybrid', 'electric'] as const
export const TRANSMISSIONS = ['automatic', 'manual'] as const
export const BODY_TYPES = ['sedan', 'suv', 'hatchback', 'wagon', 'pickup', 'van', 'coupe', 'bus', 'truck'] as const
export const DRIVES = ['2wd', '4wd', 'awd'] as const
export const CONDITIONS: Record<string, string> = {
  foreign_used: 'Foreign used (imported)',
  locally_used: 'Locally used',
  new: 'Brand new',
}
export const COLOURS = ['White', 'Black', 'Silver', 'Grey', 'Pearl White', 'Blue', 'Red', 'Maroon', 'Green', 'Brown', 'Gold', 'Beige', 'Orange', 'Yellow']
export const ENGINE_SIZES = [660, 1000, 1300, 1500, 1800, 2000, 2400, 2500, 2700, 3000, 3500, 4000, 4500, 4600, 5700]

export const FEATURES = [
  'Air conditioning', 'Climate control', 'Leather seats', 'Sunroof', 'Reverse camera', '360° camera',
  'Navigation', 'Bluetooth', 'Apple CarPlay / Android Auto', 'Keyless entry', 'Push start',
  'Cruise control', 'Parking sensors', 'Alloy wheels', 'Fog lights', 'LED headlights',
  'Electric seats', 'Heated seats', 'Third row seats', 'Roof rails', 'Tow bar', 'Bull bar',
  'Power windows', 'Power steering', 'ABS', 'Airbags', 'Traction control', 'Diff lock',
]

// Photo guide: shown one by one in the wizard. Order = order in the gallery.
export const PHOTO_ANGLES: { key: string; label: string; tip: string; required: boolean }[] = [
  { key: 'front_left', label: 'Front-left corner', tip: 'Stand at the front-left corner. Whole car in frame. This is the cover photo.', required: true },
  { key: 'front', label: 'Front', tip: 'Straight on, number plate covered or blurred.', required: true },
  { key: 'rear_right', label: 'Rear-right corner', tip: 'Stand at the back-right corner, whole car in frame.', required: true },
  { key: 'rear', label: 'Rear', tip: 'Straight on from behind.', required: true },
  { key: 'left', label: 'Left side', tip: 'Full side, step back so wheels are visible.', required: true },
  { key: 'right', label: 'Right side', tip: 'Full side from the right.', required: true },
  { key: 'dashboard', label: 'Dashboard', tip: 'From the back seat, show steering, screen and dashboard.', required: true },
  { key: 'odometer', label: 'Odometer', tip: 'Engine on, mileage number clearly readable.', required: true },
  { key: 'front_seats', label: 'Front seats', tip: 'Open the driver door, show both front seats.', required: true },
  { key: 'back_seats', label: 'Back seats', tip: 'Optional — rear seats and legroom.', required: false },
  { key: 'engine', label: 'Engine bay', tip: 'Optional — bonnet open, in good light.', required: false },
  { key: 'boot', label: 'Boot', tip: 'Optional — boot open and empty.', required: false },
  { key: 'wheels', label: 'Wheels / tyres', tip: 'Optional — close-up of a wheel and tyre tread.', required: false },
  { key: 'damage', label: 'Damage / scratches', tip: 'Optional — honest close-ups of any marks. Builds trust.', required: false },
]

export const angleLabel = (key: string) => PHOTO_ANGLES.find((a) => a.key === key)?.label ?? 'Extra photo'
