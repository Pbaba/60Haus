export const formatCurrency = (amount: number, currency: string = 'INR') => {
  // Format for Indian format (Lakhs/Crores) if INR, else standard format
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactNumber = (num: number): string => {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  }
  if (num >= 100000) {
    return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};
