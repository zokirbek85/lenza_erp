/**
 * Central Bank of Uzbekistan API Service
 * Fetches USD to UZS exchange rates
 * API Documentation: https://cbu.uz/uz/arkhiv-kursov-valyut/json/
 */

export interface ExchangeRate {
  id: string;
  Code: string;
  Ccy: string;
  CcyNm_RU: string;
  CcyNm_UZ: string;
  CcyNm_UZC: string;
  CcyNm_EN: string;
  Nominal: string;
  Rate: string;
  Diff: string;
  Date: string;
}

export interface ProcessedRate {
  date: string;
  rate: number;
  diff: number;
  nominal: number;
}

const CBU_BASE_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json';

/**
 * Fetch today's USD exchange rate
 */
export async function fetchTodayRate(): Promise<ProcessedRate | null> {
  try {
    const response = await fetch(`${CBU_BASE_URL}/USD/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ExchangeRate[] = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const usdData = data[0];
    return {
      date: usdData.Date,
      rate: parseFloat(usdData.Rate),
      diff: parseFloat(usdData.Diff),
      nominal: parseFloat(usdData.Nominal),
    };
  } catch (error) {
    console.error('Error fetching today\'s rate:', error);
    throw error;
  }
}

/**
 * Fetch USD exchange rate for a specific date
 * @param date - Date in YYYY-MM-DD format
 */
export async function fetchRateByDate(date: string): Promise<ProcessedRate | null> {
  try {
    const response = await fetch(`${CBU_BASE_URL}/USD/${date}/`);
    if (!response.ok) {
      if (response.status === 404) {
        // No data for this date (e.g., weekend)
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ExchangeRate[] = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const usdData = data[0];
    return {
      date: usdData.Date,
      rate: parseFloat(usdData.Rate),
      diff: parseFloat(usdData.Diff),
      nominal: parseFloat(usdData.Nominal),
    };
  } catch (error) {
    console.error(`Error fetching rate for ${date}:`, error);
    return null;
  }
}

/**
 * Fetch USD exchange rates for a date range
 * @param fromDate - Start date in YYYY-MM-DD format
 * @param toDate - End date in YYYY-MM-DD format
 */
export async function fetchRatesRange(fromDate: string, toDate: string): Promise<ProcessedRate[]> {
  const rates: ProcessedRate[] = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  // Iterate through each day in the range
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    try {
      const rate = await fetchRateByDate(dateStr);
      if (rate) {
        rates.push(rate);
      }
    } catch (error) {
      // Skip this date and continue
      console.warn(`Skipping date ${dateStr} due to error`);
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return rates;
}

/**
 * Fetch last N days of USD exchange rates
 * @param days - Number of days to fetch (default 7)
 */
export async function fetchLastNDays(days: number = 7): Promise<ProcessedRate[]> {
  const rates: ProcessedRate[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    try {
      const rate = await fetchRateByDate(dateStr);
      if (rate) {
        rates.unshift(rate); // Add to beginning to maintain chronological order
      }
    } catch (error) {
      console.warn(`Skipping date ${dateStr} due to error`);
    }
  }

  return rates;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format rate with proper decimals
 */
export function formatRate(rate: number): string {
  return rate.toFixed(2);
}
