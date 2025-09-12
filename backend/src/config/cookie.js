const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

export const buildCookieOptions = (overrides = {}) => ({
  ...baseCookieOptions,
  ...overrides,
});

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(
    "access_token",
    accessToken,
    buildCookieOptions({ maxAge: 60 * 60 * 1000 })
  ); // 1h
  res.cookie(
    "refresh_token",
    refreshToken,
    buildCookieOptions({ maxAge: ONE_DAY_MS })
  ); // 1d
};

export const clearAuthCookies = (res) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
};
