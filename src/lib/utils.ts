type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[];

function toVal(mix: any) {
  let k, y, str = '';
  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix;
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      for (k = 0; k < mix.length; k++) {
        if (mix[k]) {
          if (y = toVal(mix[k])) {
            str && (str += ' ');
            str += y;
          }
        }
      }
    } else {
      for (k in mix) {
        if (mix[k]) {
          str && (str += ' ');
          str += k;
        }
      }
    }
  }
  return str;
}

export function cn(...inputs: ClassValue[]) {
  let i = 0, tmp, x, str = '';
  while (i < inputs.length) {
    if (tmp = inputs[i++]) {
      if (x = toVal(tmp)) {
        str && (str += ' ');
        str += x;
      }
    }
  }
  return str;
}
