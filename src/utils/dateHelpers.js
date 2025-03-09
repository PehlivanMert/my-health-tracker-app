export const computeAge = (birthDate) => {
  let date;
  if (typeof birthDate === "string") {
    date = new Date(birthDate);
  } else if (birthDate instanceof Date) {
    date = new Date(birthDate.getTime()); // Clone to avoid mutation
  } else {
    throw new Error("Geçersiz tarih formatı!");
  }

  // Geçersiz tarih kontrolü
  if (isNaN(date.getTime())) {
    throw new Error("Geçersiz tarih!");
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const birthYear = date.getFullYear();

  let age = currentYear - birthYear;

  // Doğum ay ve gün kontrolü (UTC kullanarak saat dilimi sorununu önle)
  const currentMonth = today.getUTCMonth();
  const birthMonth = date.getUTCMonth();
  const currentDay = today.getUTCDate();
  const birthDay = date.getUTCDate();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age--;
  }

  return age;
};
