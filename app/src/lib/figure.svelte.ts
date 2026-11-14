export type Sex = 'male' | 'female';

const KEY = 'astro-vitals.figure';

function load(): Sex {
  try {
    return localStorage.getItem(KEY) === 'female' ? 'female' : 'male';
  } catch {
    return 'male';
  }
}

export const figure = $state<{ sex: Sex }>({ sex: load() });

export function setSex(sex: Sex) {
  figure.sex = sex;
  try {
    localStorage.setItem(KEY, sex);
  } catch {
  }
}
