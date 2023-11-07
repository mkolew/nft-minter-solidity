import { BigNumber, ethers } from 'ethers';
import { Common } from './Common';

/**
 * Solidity helper methods
 */
export class Solidity {
  /**
   * Solidity returns Array when returning Struct.
   * Convert that Array to Object Model.
   * @param struct solidity struct
   */
  public static async resolveStruct<T>(struct: string[]): Promise<T> {
    const object: T = (await ethers.utils.resolveProperties(struct)) as T;
    // @ts-ignore
    for (const [key, value] of Object.entries(object)) {
      if (!isNaN(parseInt(key))) {
        delete (object as { [key: string]: string })[key];
      } else if (ethers.BigNumber.isBigNumber(value)) {
        // @ts-ignore
        object[key] = this.toNumber(value);
      } else if (key === 'userName' || key === 'blockReason' || key === 'revokeValidatorReason') {
        // @ts-ignore
        object[key] = ethers.utils.parseBytes32String(value as string);
      }
    }
    return object;
  }

  /**
   * Solidity returns Array or Arrays when returning Array of Structs.
   * Convert that Array to Array of Object Models.
   * @param structsArray array of solidity structs
   */
  public static async resolveStructsArray<T>(structsArray: string[][]): Promise<T[]> {
    const array: T[] = [];
    for (const struct of structsArray) {
      if (struct[0]) {
        array.push(await this.resolveStruct(struct));
      }
    }
    return array;
  }

  /**
   * Convert big number to number
   * @param n big number
   */
  public static toNumber(n: BigNumber) {
    return ethers.BigNumber.from(n).toNumber();
  }

  /**
   * Convert wei to eth number and round it to 2 decimal places
   * @param wei smallest denomination of ether
   */
  public static toEth(wei: number | BigNumber | bigint): number {
    return Math.floor(parseFloat(ethers.utils.formatEther(wei)) * 100) / 100;
  }

  /**
   * Convert unix timestamp to DateHash (DD.MM.YYYY)
   * @param unixTimestamp seconds timestamp
   */
  public static utToDateHash(unixTimestamp: number): string {
    return this.toDateHash(unixTimestamp * 1000);
  }

  /**
   * Convert milliseconds timestamp to DateHash (DD.MM.YYYY)
   * @param timestamp milliseconds timestamp
   */
  public static toDateHash(timestamp: number): string {
    const date: Date = new Date(timestamp);

    const day: number = date.getUTCDate();
    const month: number = date.getUTCMonth() + 1;
    const year: number = date.getUTCFullYear();

    return ethers.utils.formatBytes32String(`${day}.${month}.${year}`);
  }

  /**
   * Convert DateHash (DD.MM.YYYY) to Date
   * @param dateHash bytes32 representation of DD.MM.YYYY
   */
  public static toDate(dateHash: string): Date {
    const dateString = ethers.utils.parseBytes32String(dateHash);
    const dateParts = dateString.split('.');

    const day: number = parseInt(dateParts[0]);
    const month: number = parseInt(dateParts[1]);
    const year: number = parseInt(dateParts[2]);

    return Common.dmyToDate(day, month, year);
  }

  /**
   * Convert DateHash List [DD.MM.YYYY] to milliseconds timestamps
   * @param dateHashes bytes32 representation of [DD.MM.YYYY]
   */
  public static toTimestamps(dateHashes: string[]): number[] {
    return dateHashes.map((dateHash: string) => this.toDate(dateHash).getTime());
  }
}
