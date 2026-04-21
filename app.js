(function () {
  const byId = (id) => document.getElementById(id);

  const subtitleText = byId("subtitleText");
  const statusChip = byId("statusChip");
  const errorBox = byId("errorBox");
  const detailsGrid = byId("detailsGrid");
  const actions = byId("actions");

  const hospitalName = byId("hospitalName");
  const amountText = byId("amountText");
  const appointmentId = byId("appointmentId");
  const phoneText = byId("phoneText");
  const tokenText = byId("tokenText");
  const expireText = byId("expireText");

  const payNowBtn = byId("payNowBtn");
  const copyBtn = byId("copyBtn");

  let tokenData = null;

  function setChip(label, variant) {
    statusChip.textContent = label;
    statusChip.className = "status-chip";
    statusChip.classList.add(`status-${variant}`);
  }

  function setError(message) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function parseToken() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("token") || "").trim();
  }

  function parseApiBase() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get("api_base") || "").trim();
    if (fromQuery) return fromQuery.replace(/\/+$/, "");

    const fromConfig = (window.NYRA_API_BASE || "").trim();
    if (fromConfig) return fromConfig.replace(/\/+$/, "");

    if (window.location.protocol === "file:") return "https://payments.nyraai.io";

    return window.location.origin.replace(/\/+$/, "");
  }

  function formatMoney(amount, currency) {
    const numeric = Number(amount || 0);
    const safeCurrency = String(currency || "INR").toUpperCase();

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 2,
      }).format(numeric);
    } catch {
      return `${safeCurrency} ${numeric.toFixed(2)}`;
    }
  }

  function toReadableDate(input) {
    if (!input) return "No expiry";
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return "No expiry";
    return parsed.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  async function resolveToken(token, apiBase) {
    const endpoint = `${apiBase}/api/whatsapp/payment-link/token/${encodeURIComponent(token)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
      endpoint,
    };
  }

  function populateDetails(data) {
    hospitalName.textContent = data.hospital_name || "Unknown hospital";
    amountText.textContent = formatMoney(data.amount, data.currency);
    appointmentId.textContent = data.appointment_id || "Not provided";
    phoneText.textContent = data.phone || "Not provided";
    tokenText.textContent = data.token || "-";
    expireText.textContent = toReadableDate(data.expire_at);
  }

  function setStateForInactive(status) {
    const normalized = String(status || "").toUpperCase();

    if (normalized === "PAID") {
      setChip("Paid", "paid");
      subtitleText.textContent = "This payment link is already paid.";
      return;
    }

    if (normalized === "EXPIRED") {
      setChip("Expired", "expired");
      subtitleText.textContent = "This payment link has expired.";
      return;
    }

    if (normalized === "CANCELLED") {
      setChip("Cancelled", "cancelled");
      subtitleText.textContent = "This payment link has been cancelled.";
      return;
    }

    setChip("Unavailable", "invalid");
    subtitleText.textContent = "This payment link is not active.";
  }

  async function init() {
    clearError();
    setChip("Loading", "loading");

    const token = parseToken();
    const apiBase = parseApiBase();

    if (!token) {
      setChip("Invalid", "invalid");
      subtitleText.textContent = "Payment token is missing in URL.";
      setError("Add a token query parameter. Example: /payments?token=your_token_here");
      return;
    }

    try {
      const result = await resolveToken(token, apiBase);
      const payload = result.body || {};
      const data = payload.data || null;

      if (!data) {
        setChip("Invalid", "invalid");
        subtitleText.textContent = "Could not load payment details.";
        setError(payload.message || payload.error || "Payment token lookup failed.");
        return;
      }

      tokenData = data;
      detailsGrid.hidden = false;
      populateDetails(data);

      const resolvedStatus = String(data.status || "ACTIVE").toUpperCase();

      if (!result.ok || resolvedStatus !== "ACTIVE") {
        setStateForInactive(resolvedStatus);
        actions.hidden = true;

        if (!result.ok) {
          setError(payload.message || payload.error || `Token endpoint returned HTTP ${result.status}.`);
        }
        return;
      }

      setChip("Active", "active");
      subtitleText.textContent = "Payment link is valid. Continue to Razorpay to complete payment.";
      actions.hidden = false;
    } catch (error) {
      setChip("Error", "invalid");
      subtitleText.textContent = "Unable to load payment details.";
      setError(error?.message || "Unexpected network error.");
    }
  }

  payNowBtn.addEventListener("click", function () {
    clearError();

    const paymentUrl = tokenData?.payment_url ? String(tokenData.payment_url).trim() : "";
    if (!paymentUrl) {
      setError("Payment URL missing for this token.");
      return;
    }

    try {
      const url = new URL(paymentUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        setError("Invalid payment URL protocol.");
        return;
      }
      window.location.assign(url.toString());
    } catch {
      setError("Invalid payment URL.");
    }
  });

  copyBtn.addEventListener("click", async function () {
    clearError();

    const paymentUrl = tokenData?.payment_url ? String(tokenData.payment_url).trim() : "";
    if (!paymentUrl) {
      setError("Nothing to copy. Payment URL is missing.");
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentUrl);
      copyBtn.textContent = "Link Copied";
      window.setTimeout(function () {
        copyBtn.textContent = "Copy Payment Link";
      }, 1400);
    } catch {
      setError("Could not copy. Please copy the URL manually from browser.");
    }
  });

  init();
})();
