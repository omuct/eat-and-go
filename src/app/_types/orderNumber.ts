const usedOrderNumbers: Set<string> = new Set();

function generateOrderNumber(
  storeNumber: number,
  sequenceNumber: number
): string {
  const storeStr = String(storeNumber).padStart(3, "0");

  const sequenceStr = String(sequenceNumber).padStart(3, "0");

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
  usedOrderNumbers.add(orderNumber);
  return orderNumber;
}

const storeNumber = 123;
const sequenceNumber = 1;
const orderNumber = generateOrderNumber(storeNumber, sequenceNumber);
console.log(orderNumber);
