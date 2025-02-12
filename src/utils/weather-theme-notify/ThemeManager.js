// Tema seçeneklerini dinamik hale getirin
export const themes = [
  { value: "light", label: "Açık 🌞" },
  { value: "dark", label: "Koyu 🌙" },
  { value: "nature", label: "Doğa 🌿" },
  { value: "ocean", label: "Okyanus 🌊" },
  { value: "sunset", label: "Gün Batımı 🌅" },
  { value: "midnight", label: "Gece Yarısı 🌃" },
  { value: "pastel", label: "Pastel 🎨" },
  { value: "coffee", label: "Kahve ☕" },
];

export const handleThemeChange = (newTheme, setTheme) => {
  setTheme(newTheme);
  localStorage.setItem("selectedTheme", newTheme); // Seçili temayı kaydet
  document.documentElement.setAttribute("data-theme", newTheme); // Tema değişikliğini uygula
};

// Sayfa yüklenmeden önce varsayılan temayı al ve uygula
export const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("selectedTheme");
  // Eğer localStorage'da tema varsa onu kullan, yoksa "light" kullan
  const initialTheme = savedTheme || "light";

  // Sayfa yüklenmeden önce temayı uygula
  document.documentElement.setAttribute("data-theme", initialTheme);
  return initialTheme;
};
