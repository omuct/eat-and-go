const usedOrderNumbers: Set<string> = new Set();

function generateOrderNumber(
  storeNumber: number,
  sequenceNumber: number
): string {
  // Ensure storeNumber is a 3-digit number
  const storeStr = String(storeNumber).padStart(3, "0");

  // Ensure sequenceNumber is a 3-digit number
  const sequenceStr = String(sequenceNumber).padStart(3, "0");

  // Generate a random 3-character alphanumeric suffix
  const generateRandomSuffix = (): string => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
    return result;
  };

  let orderNumber: string;
  do {
    const suffix = generateRandomSuffix();
    orderNumber = `${storeStr}${sequenceStr}${suffix}`;
  } while (usedOrderNumbers.has(orderNumber));

  // Store the generated order number to prevent reuse
  usedOrderNumbers.add(orderNumber);

  return orderNumber;
}

// Example usage:
const storeNumber = 123; // Example store number
const sequenceNumber = 1; // Example sequence number for the day
const orderNumber = generateOrderNumber(storeNumber, sequenceNumber);
console.log(orderNumber);
