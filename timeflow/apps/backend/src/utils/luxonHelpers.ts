import { DateTime } from 'luxon';
import type {
  DateObjectUnits,
  DateTime as LuxonDateTime,
  DateTimeJSOptions,
  DateTimeMaybeValid,
  DateTimeSetObject,
  DateTimeUnit,
  DurationLike,
  Valid,
} from 'luxon';

type DateTimeWithValidity = LuxonDateTime<Valid>;

export function ensureValidDateTime(value: DateTimeMaybeValid): DateTimeWithValidity {
  if (!value.isValid) {
    const message = value.invalidExplanation ?? value.invalidReason ?? 'Invalid DateTime value';
    throw new Error(message);
  }
  return value as DateTimeWithValidity;
}

export class SafeDateTime {
  private constructor(private readonly dt: DateTimeWithValidity) {}

  static from(value: DateTimeMaybeValid): SafeDateTime {
    return new SafeDateTime(ensureValidDateTime(value));
  }

  static fromJSDate(date: Date, options?: Parameters<typeof DateTime.fromJSDate>[1]): SafeDateTime {
    return SafeDateTime.from(DateTime.fromJSDate(date, options));
  }

  static fromISO(value: string, options?: Parameters<typeof DateTime.fromISO>[1]): SafeDateTime {
    return SafeDateTime.from(DateTime.fromISO(value, options));
  }

  static fromMillis(value: number, options?: Parameters<typeof DateTime.fromMillis>[1]): SafeDateTime {
    return SafeDateTime.from(DateTime.fromMillis(value, options));
  }

  static fromObject(obj: DateObjectUnits, options?: DateTimeJSOptions): SafeDateTime {
    return SafeDateTime.from(DateTime.fromObject(obj, options));
  }

  static max(...values: SafeDateTime[]): SafeDateTime {
    return SafeDateTime.from(DateTime.max(...values.map((value) => value.dt)));
  }

  static min(...values: SafeDateTime[]): SafeDateTime {
    return SafeDateTime.from(DateTime.min(...values.map((value) => value.dt)));
  }

  toDateTime(): DateTimeWithValidity {
    return this.dt;
  }

  plus(duration: DurationLike): SafeDateTime {
    return SafeDateTime.from(this.dt.plus(duration));
  }

  startOf(unit: DateTimeUnit): SafeDateTime {
    return SafeDateTime.from(this.dt.startOf(unit));
  }

  endOf(unit: DateTimeUnit): SafeDateTime {
    return SafeDateTime.from(this.dt.endOf(unit));
  }

  set(values: DateTimeSetObject): SafeDateTime {
    return SafeDateTime.from(this.dt.set(values));
  }

  get hour(): number {
    return this.dt.hour;
  }

  get minute(): number {
    return this.dt.minute;
  }

  get weekday(): number {
    return this.dt.weekday;
  }

  toMillis(): number {
    return this.dt.toMillis();
  }

  toFormat(format: string): string {
    return this.dt.toFormat(format);
  }

  get isValid(): boolean {
    return this.dt.isValid;
  }

  toJSDate(): Date {
    return this.dt.toJSDate();
  }

  valueOf(): number {
    return this.dt.valueOf();
  }

  toUTC(): SafeDateTime {
    return SafeDateTime.from(this.dt.toUTC());
  }
}

export function fromJSDate(date: Date, options?: Parameters<typeof DateTime.fromJSDate>[1]): SafeDateTime {
  return SafeDateTime.fromJSDate(date, options);
}

export function fromISO(value: string, options?: Parameters<typeof DateTime.fromISO>[1]): SafeDateTime {
  return SafeDateTime.fromISO(value, options);
}

export function fromMillis(value: number, options?: Parameters<typeof DateTime.fromMillis>[1]): SafeDateTime {
  return SafeDateTime.fromMillis(value, options);
}

export function fromObject(obj: DateObjectUnits, options?: DateTimeJSOptions): SafeDateTime {
  return SafeDateTime.fromObject(obj, options);
}

export function maxDateTime(...values: SafeDateTime[]): SafeDateTime {
  return SafeDateTime.max(...values);
}

export function minDateTime(...values: SafeDateTime[]): SafeDateTime {
  return SafeDateTime.min(...values);
}

export type ValidDateTime = DateTimeWithValidity;
