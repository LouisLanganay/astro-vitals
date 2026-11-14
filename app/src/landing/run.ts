import { mount, unmount } from 'svelte';

import { landingSeen } from './gate';
import Landing from './Landing.svelte';

export function runLanding(): Promise<() => void> {
  return new Promise((resolve) => {
    const landing = mount(Landing, {
      target: document.body,
      props: {
        oncovered: (reveal: () => void) => {
          landingSeen();
          resolve(reveal);
        },
        ondone: () => void unmount(landing),
      },
    });
  });
}
