export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{6,20}$/;
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&+])[A-Za-z\d@$!%*?&+]{8,}$/;

export const validateUsername = (username) => {
  if (!USERNAME_PATTERN.test(username)) {
    return {
      isValid: false,
      message:
        "Kullanıcı adı 6-20 karakter uzunluğunda olmalı ve sadece harf, rakam ve alt çizgi içermelidir.",
    };
  }
  return { isValid: true };
};

export const validatePassword = (password) => {
  if (!PASSWORD_PATTERN.test(password)) {
    return {
      isValid: false,
      message:
        "Şifre en az 8 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.",
    };
  }
  return { isValid: true };
};
