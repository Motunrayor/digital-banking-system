const axios = require("axios");

const nibssApi = axios.create({
  baseURL: process.env.NIBSS_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const insertBvn = async (data) => {
  const response = await nibssApi.post("/api/insertBvn", data);
  return response.data;
};

const validateBvn = async (bvn) => {
  const response = await nibssApi.post("/api/validateBvn", {
    bvn,
  });

  return response.data;
};

const insertNin = async (data) => {
  const response = await nibssApi.post("/api/insertNin", data);
  return response.data;
};

const validateNin = async (nin) => {
  const response = await nibssApi.post("/api/validateNin", {
    nin,
  });

  return response.data;
};

const getNibssToken = async () => {
  const response = await axios.post(
    "https://nibssbyphoenix.onrender.com/api/auth/token",
    {
      apiKey: process.env.NIBSS_API_KEY?.trim(),
      apiSecret: process.env.NIBSS_API_SECRET?.trim(),
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  console.log("NIBSS token received:", !!response.data.token);

  return response.data.token;
};

const createAccount = async (data) => {
  const token = await getNibssToken();

  const response = await axios.post(
    "https://nibssbyphoenix.onrender.com/api/account/create",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

const getAccountBalance = async (accountNumber) => {
  const token = await getNibssToken();

  const response = await nibssApi.get(`/api/account/balance/${accountNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

module.exports = {
  insertBvn,
  validateBvn,
  insertNin,
  validateNin,
  getNibssToken,
  createAccount,
  getAccountBalance,
};
