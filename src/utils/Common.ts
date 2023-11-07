/**
 * Common helper methods
 */
export class Common {

  /**
   * Get today in milliseconds timestamp
   * e.g. 1670065200 = Sat Dec 03 2022 12:00:00 GMT+0100 (Central European Standard Time)
   */
  public static today(): Date {
    const date: Date = new Date();

    const day: number = date.getUTCDate();
    const month: number = date.getUTCMonth() + 1;
    const year: number = date.getUTCFullYear();

    return this.dmyToDate(day, month, year);
  }

  /**
   * Create date out of year, month and day
   * @param day
   * @param month
   * @param year
   */
  public static dmyToDate(day: number, month: number, year: number) {
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  /**
   * Convert milliseconds timestamp to unix timestamp
   * @param timestamp milliseconds timestamp
   */
  public static toUnixTimestamp(timestamp: number): number {
    return Math.trunc(timestamp / 1000);
  }
}
