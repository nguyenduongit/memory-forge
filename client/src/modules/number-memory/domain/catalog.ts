export type MemoryItem = {
  key: string;
  label: string;
  assetKey: string;
  symbol: string;
  groupOrder: number;
};

const labels = [
  "Quả trứng", "Cái dù", "Con vịt", "Trái tim", "Cái ghế", "Quả táo", "Vỏ ốc", "Cái rìu", "Người tuyết", "Hươu cao cổ",
  "Con heo", "Cái thang", "Cá mập", "Con bướm", "Chiếc thuyền buồm", "Túi tiền", "Ốc sên", "Nốt nhạc", "Đèn giao thông", "Con chó",
  "Quả bom", "Đèn cầy", "Con thiên nga", "Con công", "Con sóc", "Cần cẩu", "Gà trống", "Con chuột", "Con thỏ", "Chuột máy tính",
  "Ngọn núi", "Bóng đèn", "Vòi sen", "Khúc xương", "Dưa hấu", "Đu đủ", "Hoa hồng", "Loa cầm tay", "Nhẫn kim cương", "Con tê giác",
  "Bút chì", "Bình chữa cháy", "Diều", "Người lướt sóng", "Rừng thông", "Nam châm", "Cung tên", "Cầu thang", "Doraemon", "Ly tách",
  "Xe đạp", "Sư tử", "Ô tô", "Chiếc răng", "Người phục vụ", "Găng tay đấm bốc", "Phao cứu sinh", "Cổng thành", "Chú hề", "Con mèo",
  "Cua", "Kẹo mút", "Điện thoại cổ", "Xe máy", "Binh lính", "Cú mèo", "Tai nghe", "Con cá", "Bình hồ lô", "Bát quái",
  "Sầu riêng", "Lá cờ", "Con ma", "Con trâu", "Con đường", "Xe tăng", "Nước mía", "Súng lục", "Quả cà chua", "Trái dừa",
  "Dấu chân", "Loa thùng", "Cá sấu", "Cây nấm", "Kéo", "Hạt đậu", "Nho", "Mắt kính", "Còng tay", "Thuốc nổ",
  "Cái thớt", "Bóng rổ", "Bong bóng", "Cúp chiến thắng", "Gốc cây", "Bác sĩ", "Trống hoàng gia", "Con dê", "Con ong", "Vợt cầu lông",
] as const;

const symbols = [
  "◯", "⌂", "◒", "♥", "▱", "●", "◌", "⚒", "☃", "♙",
  "◕", "▥", "◖", "✦", "△", "◈", "➰", "♫", "▦", "♧",
  "✹", "♟", "♧", "✺", "✾", "⚑", "♜", "◉", "◠", "▣",
  "▲", "☼", "⌇", "⌁", "◒", "◓", "✿", "◧", "◇", "◒",
  "✎", "♧", "✧", "⌇", "♧", "⌒", "➹", "▤", "◉", "◡",
  "◌", "♛", "▰", "⌂", "♟", "✺", "◉", "▥", "✹", "◒",
  "◖", "●", "☎", "◈", "♙", "◉", "◒", "◓", "◒", "☯",
  "✹", "⚑", "♧", "♞", "⌁", "▰", "▱", "✦", "●", "◒",
  "⌖", "◧", "◒", "✾", "✂", "◆", "●", "◉", "⌘", "✹",
  "▭", "●", "○", "★", "♣", "✚", "◉", "♧", "✦", "⌁",
] as const;

const assetKeys = [
  "number-00-egg","number-01-umbrella","number-02-duck","number-03-heart","number-04-chair","number-05-apple","number-06-shell","number-07-axe","number-08-snowman","number-09-giraffe",
  "number-10-pig","number-11-ladder","number-12-shark","number-13-butterfly","number-14-sailboat","number-15-money-bag","number-16-snail","number-17-music-note","number-18-traffic-light","number-19-dog",
  "number-20-bomb","number-21-candle","number-22-swan","number-23-peacock","number-24-squirrel","number-25-crane","number-26-rooster","number-27-mouse","number-28-rabbit","number-29-computer-mouse",
  "number-30-mountain","number-31-lightbulb","number-32-shower","number-33-bone","number-34-watermelon","number-35-papaya","number-36-rose","number-37-megaphone","number-38-diamond-ring","number-39-rhinoceros",
  "number-40-pencil","number-41-fire-extinguisher","number-42-kite","number-43-surfer","number-44-pine-forest","number-45-magnet","number-46-bow-arrow","number-47-staircase","number-48-doraemon","number-49-cup",
  "number-50-bicycle","number-51-lion","number-52-car","number-53-tooth","number-54-waiter","number-55-boxing-gloves","number-56-life-buoy","number-57-castle-gate","number-58-clown","number-59-cat",
  "number-60-crab","number-61-lollipop","number-62-vintage-phone","number-63-motorcycle","number-64-soldier","number-65-owl","number-66-headphones","number-67-fish","number-68-gourd","number-69-bagua",
  "number-70-durian","number-71-flag","number-72-ghost","number-73-buffalo","number-74-road","number-75-tank","number-76-sugarcane-drink","number-77-pistol","number-78-tomato","number-79-coconut",
  "number-80-footprint","number-81-speaker","number-82-crocodile","number-83-mushroom","number-84-scissors","number-85-bean","number-86-grapes","number-87-glasses","number-88-handcuffs","number-89-dynamite",
  "number-90-cutting-board","number-91-basketball","number-92-balloons","number-93-trophy","number-94-tree-stump","number-95-doctor","number-96-royal-drum","number-97-goat","number-98-bee","number-99-badminton-racket",
] as const;

export const numberCatalog: MemoryItem[] = labels.map((label, index) => ({
  key: String(index).padStart(2, "0"),
  label,
  assetKey: assetKeys[index] ?? `number-${String(index).padStart(2, "0")}`,
  symbol: symbols[index] ?? "✦",
  groupOrder: Math.floor(index / 10),
}));

export function getScopeCatalog(scope: 10 | 50 | 100): MemoryItem[] {
  return numberCatalog.slice(0, scope);
}

export function getCatalogItem(key: string): MemoryItem | undefined {
  return numberCatalog.find((item) => item.key === key);
}
