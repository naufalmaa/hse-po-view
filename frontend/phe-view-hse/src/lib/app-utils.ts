import { MdOutlineCancel, MdCheckCircleOutline, MdWarningAmber } from "react-icons/md";

export const getStatusDateFromObject = (obj: Record<string, any>[] = [], key = "expiredDate", isLifetime = false) => {
  if (!Array.isArray(obj) || obj.length === 0) {
    return {
      status: "missing",
      styles: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900',
      icon: MdWarningAmber,
      value: "Missing",
      item: undefined
    };
  }

  if (isLifetime) {
    const validItems = obj
      .filter(item => item?.[key])
      .sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());

    if (validItems.length === 0) {
      return {
        status: "missing",
        styles: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900',
        icon: MdWarningAmber,
        value: "Missing",
        item: undefined
      };
    }

    return {
      status: "active",
      styles: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900',
      icon: MdCheckCircleOutline,
      value: validItems[0][key],
      item: validItems[0]
    };
  }

  // check if any item is permanent=true, if yes return the item with the latest date with the permanent true
  const permanentItems = obj
    .filter(item => item?.[key] && item?.isPermanent === true)
    .sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());

  if (permanentItems.length > 0) {
    return {
      status: "active",
      styles: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900',
      icon: MdCheckCircleOutline,
      value: permanentItems[0][key],
      item: permanentItems[0]
    };
  }

  try {
    const currentDate = new Date();
    const validItems = obj
      .filter(item => item?.[key])
      .sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());

    if (validItems.length === 0) {
      return {
        status: "missing",
        styles: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900',
        icon: MdWarningAmber,
        value: "Missing",
        item: undefined
      };
    }

    const expiredDate = new Date(validItems[0][key]);

    if (isNaN(expiredDate.getTime())) {
      return {
        status: "invalid_date",
        styles: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900',
        icon: MdWarningAmber,
        value: "Invalid Date",
        item: validItems[0]
      };
    }

    if (expiredDate < currentDate) {
      return {
        status: "expired",
        styles: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900',
        icon: MdOutlineCancel,
        value: validItems[0][key],
        item: validItems[0]
      };
    }

    return {
      status: "active",
      styles: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900',
      icon: MdCheckCircleOutline,
      value: validItems[0][key],
      item: validItems[0]
    };
  } catch (error) {
    return {
      status: "error",
      styles: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900',
      icon: MdWarningAmber,
      value: "Error",
      item: undefined
    };
  }
};