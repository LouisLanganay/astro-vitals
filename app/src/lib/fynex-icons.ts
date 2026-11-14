// Generated from @fynex/icons 0.2.0 (MIT, The Fynex authors, https://icons.fynexapp.com).
// The drawings use the lucide grid (ISC).

import type { IconDef } from "./icon-motion";

export const FYNEX: Record<string, IconDef> = {
 "home": {
  "source": "sun",
  "parts": [
   {
    "tag": "circle",
    "cx": 12,
    "cy": 12,
    "r": 4
   },
   {
    "tag": "path",
    "d": "M12 2v2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "M12 20v2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m4.93 4.93 1.41 1.41",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m17.66 17.66 1.41 1.41",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "M2 12h2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "M20 12h2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m6.34 17.66-1.41 1.41",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m19.07 4.93-1.41 1.41",
    "part": "rays"
   }
  ],
  "motion": {
   "rays": {
    "initial": {
     "rotate": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "rotate": 45,
     "transition": {
      "duration": 0.5,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    }
   }
  },
  "options": {
   "origins": {
    "rays": [
     12,
     12
    ]
   }
  }
 },
 "check": {
  "source": "clipboard-check",
  "parts": [
   {
    "tag": "rect",
    "width": 8,
    "height": 4,
    "x": 8,
    "y": 2,
    "rx": 1,
    "ry": 1
   },
   {
    "tag": "path",
    "d": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
   },
   {
    "tag": "path",
    "d": "m9 14 2 2 4-4",
    "part": "check"
   }
  ],
  "motion": {
   "check": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      1
     ],
     "opacity": [
      0,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.35,
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.12,
       "ease": "linear"
      }
     }
    }
   }
  },
  "options": {}
 },
 "body": {
  "source": "user",
  "parts": [
   {
    "tag": "path",
    "d": "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
   },
   {
    "tag": "circle",
    "cx": 12,
    "cy": 7,
    "r": 4,
    "part": "head"
   }
  ],
  "motion": {
   "head": {
    "initial": {
     "y": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "y": [
      0,
      -1,
      0
     ],
     "transition": {
      "duration": 0.35,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "trends": {
  "source": "trending-up",
  "parts": [
   {
    "tag": "polyline",
    "points": "2 17 8.5 10.5 13.5 15.5 22 7",
    "part": "line"
   },
   {
    "tag": "polyline",
    "points": "16 7 22 7 22 13",
    "part": "head"
   }
  ],
  "motion": {
   "line": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      1
     ],
     "opacity": [
      0,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.45,
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.12,
       "ease": "linear"
      }
     }
    }
   },
   "head": {
    "initial": {
     "opacity": 1,
     "scale": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "opacity": [
      0,
      0,
      1
     ],
     "scale": [
      0.7,
      0.7,
      1
     ],
     "transition": {
      "duration": 0.5,
      "times": [
       0,
       0.6,
       1
      ],
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    }
   }
  },
  "options": {}
 },
 "tests": {
  "source": "timer",
  "parts": [
   {
    "tag": "line",
    "x1": 10,
    "x2": 14,
    "y1": 2,
    "y2": 2,
    "part": "button"
   },
   {
    "tag": "line",
    "x1": 12,
    "x2": 15,
    "y1": 14,
    "y2": 11,
    "part": "hand"
   },
   {
    "tag": "circle",
    "cx": 12,
    "cy": 14,
    "r": 8
   }
  ],
  "motion": {
   "button": {
    "initial": {
     "y": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "y": [
      0,
      1,
      0
     ],
     "transition": {
      "duration": 0.3,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   },
   "hand": {
    "initial": {
     "rotate": 0,
     "transition": {
      "duration": 0
     }
    },
    "animate": {
     "rotate": [
      0,
      360
     ],
     "transition": {
      "duration": 0.6,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    }
   }
  },
  "options": {
   "origins": {
    "hand": [
     12,
     14
    ]
   }
  }
 },
 "export": {
  "source": "upload",
  "parts": [
   {
    "tag": "path",
    "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
   },
   {
    "tag": "polyline",
    "points": "17 8 12 3 7 8",
    "part": "arrow"
   },
   {
    "tag": "line",
    "x1": 12,
    "x2": 12,
    "y1": 3,
    "y2": 15,
    "part": "arrow"
   }
  ],
  "motion": {
   "arrow": {
    "initial": {
     "y": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "y": [
      0,
      -1.5,
      0
     ],
     "transition": {
      "duration": 0.4,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "rules": {
  "source": "list",
  "parts": [
   {
    "tag": "path",
    "d": "M3 12h.01"
   },
   {
    "tag": "path",
    "d": "M3 18h.01"
   },
   {
    "tag": "path",
    "d": "M3 6h.01"
   },
   {
    "tag": "path",
    "d": "M8 12h13",
    "part": "l2"
   },
   {
    "tag": "path",
    "d": "M8 18h13",
    "part": "l3"
   },
   {
    "tag": "path",
    "d": "M8 6h13",
    "part": "l1"
   }
  ],
  "motion": {
   "l1": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      1
     ],
     "opacity": [
      0,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.3,
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.12,
       "ease": "linear"
      }
     }
    }
   },
   "l2": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      0,
      1
     ],
     "opacity": [
      0,
      0,
      1,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.37,
       "times": [
        0,
        0.1891891891891892,
        1
       ],
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.37,
       "times": [
        0,
        0.1891891891891892,
        0.5135135135135136,
        1
       ],
       "ease": "linear"
      }
     }
    }
   },
   "l3": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      0,
      1
     ],
     "opacity": [
      0,
      0,
      1,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.44,
       "times": [
        0,
        0.31818181818181823,
        1
       ],
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.44,
       "times": [
        0,
        0.31818181818181823,
        0.5909090909090909,
        1
       ],
       "ease": "linear"
      }
     }
    }
   }
  },
  "options": {}
 },
 "eye": {
  "source": "eye",
  "parts": [
   {
    "tag": "path",
    "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
   },
   {
    "tag": "circle",
    "cx": 12,
    "cy": 12,
    "r": 3
   }
  ],
  "motion": {
   "group": {
    "initial": {
     "scaleY": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "scaleY": [
      1,
      0.1,
      1
     ],
     "transition": {
      "duration": 0.35,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "bolt": {
  "source": "zap",
  "parts": [
   {
    "tag": "path",
    "d": "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
   }
  ],
  "motion": {
   "group": {
    "initial": {
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "opacity": [
      1,
      0.3,
      1,
      0.6,
      1
     ],
     "transition": {
      "duration": 0.45,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "moon": {
  "source": "moon",
  "parts": [
   {
    "tag": "path",
    "d": "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
   }
  ],
  "motion": {
   "group": {
    "initial": {
     "rotate": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "rotate": [
      0,
      -15,
      8,
      0
     ],
     "transition": {
      "duration": 0.5,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "smile": {
  "source": "smile",
  "parts": [
   {
    "tag": "circle",
    "cx": 12,
    "cy": 12,
    "r": 10
   },
   {
    "tag": "path",
    "d": "M8 14s1.5 2 4 2 4-2 4-2",
    "part": "mouth"
   },
   {
    "tag": "line",
    "x1": 9,
    "x2": 9.01,
    "y1": 9,
    "y2": 9
   },
   {
    "tag": "line",
    "x1": 15,
    "x2": 15.01,
    "y1": 9,
    "y2": 9
   }
  ],
  "motion": {
   "mouth": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      1
     ],
     "opacity": [
      0,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.35,
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.12,
       "ease": "linear"
      }
     }
    }
   }
  },
  "options": {}
 },
 "battery": {
  "source": "battery",
  "parts": [
   {
    "tag": "rect",
    "width": 16,
    "height": 10,
    "x": 2,
    "y": 7,
    "rx": 2,
    "ry": 2
   },
   {
    "tag": "line",
    "x1": 22,
    "x2": 22,
    "y1": 11,
    "y2": 13,
    "part": "terminal"
   }
  ],
  "motion": {
   "terminal": {
    "initial": {
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "opacity": [
      1,
      0.15,
      1
     ],
     "transition": {
      "duration": 0.45,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "brief": {
  "source": "briefcase",
  "parts": [
   {
    "tag": "path",
    "d": "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
   },
   {
    "tag": "rect",
    "width": 20,
    "height": 14,
    "x": 2,
    "y": 6,
    "rx": 2
   }
  ],
  "motion": {
   "group": {
    "initial": {
     "y": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "y": [
      0,
      -1,
      0
     ],
     "transition": {
      "duration": 0.4,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "pulse": {
  "source": "activity",
  "parts": [
   {
    "tag": "path",
    "d": "M2 12h2.49a2 2 0 0 0 1.92-1.46l2.35-8.36a.25.25 0 0 1 .48 0l5.52 19.64a.25.25 0 0 0 .48 0l2.35-8.36A2 2 0 0 1 19.52 12H22",
    "part": "pulse"
   }
  ],
  "motion": {
   "pulse": {
    "initial": {
     "pathLength": 1,
     "opacity": 1,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "pathLength": [
      0,
      1
     ],
     "opacity": [
      0,
      1
     ],
     "transition": {
      "pathLength": {
       "duration": 0.55,
       "ease": [
        0.23,
        1,
        0.32,
        1
       ]
      },
      "opacity": {
       "duration": 0.12,
       "ease": "linear"
      }
     }
    }
   }
  },
  "options": {}
 },
 "sun": {
  "source": "sun",
  "parts": [
   {
    "tag": "circle",
    "cx": 12,
    "cy": 12,
    "r": 4
   },
   {
    "tag": "path",
    "d": "M12 2v2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "M12 20v2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m4.93 4.93 1.41 1.41",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m17.66 17.66 1.41 1.41",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "M2 12h2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "M20 12h2",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m6.34 17.66-1.41 1.41",
    "part": "rays"
   },
   {
    "tag": "path",
    "d": "m19.07 4.93-1.41 1.41",
    "part": "rays"
   }
  ],
  "motion": {
   "rays": {
    "initial": {
     "rotate": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "rotate": 45,
     "transition": {
      "duration": 0.5,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    }
   }
  },
  "options": {
   "origins": {
    "rays": [
     12,
     12
    ]
   }
  }
 },
 "settings": {
  "source": "sliders-horizontal",
  "parts": [
   {
    "tag": "line",
    "x1": 21,
    "x2": 14,
    "y1": 4,
    "y2": 4
   },
   {
    "tag": "line",
    "x1": 10,
    "x2": 3,
    "y1": 4,
    "y2": 4
   },
   {
    "tag": "line",
    "x1": 21,
    "x2": 12,
    "y1": 12,
    "y2": 12
   },
   {
    "tag": "line",
    "x1": 8,
    "x2": 3,
    "y1": 12,
    "y2": 12
   },
   {
    "tag": "line",
    "x1": 21,
    "x2": 16,
    "y1": 20,
    "y2": 20
   },
   {
    "tag": "line",
    "x1": 12,
    "x2": 3,
    "y1": 20,
    "y2": 20
   },
   {
    "tag": "line",
    "x1": 14,
    "x2": 14,
    "y1": 2,
    "y2": 6,
    "part": "k1"
   },
   {
    "tag": "line",
    "x1": 8,
    "x2": 8,
    "y1": 10,
    "y2": 14,
    "part": "k2"
   },
   {
    "tag": "line",
    "x1": 16,
    "x2": 16,
    "y1": 18,
    "y2": 22,
    "part": "k3"
   }
  ],
  "motion": {
   "k1": {
    "initial": {
     "x": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "x": [
      0,
      -2,
      0
     ],
     "transition": {
      "duration": 0.4,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   },
   "k2": {
    "initial": {
     "x": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "x": [
      0,
      2,
      0
     ],
     "transition": {
      "duration": 0.4,
      "delay": 0.06,
      "ease": "easeInOut"
     }
    }
   },
   "k3": {
    "initial": {
     "x": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "x": [
      0,
      -2,
      0
     ],
     "transition": {
      "duration": 0.4,
      "delay": 0.12,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 },
 "chevron": {
  "source": "chevron-right",
  "parts": [
   {
    "tag": "path",
    "d": "m9 18 6-6-6-6"
   }
  ],
  "motion": {
   "group": {
    "initial": {
     "x": 0,
     "transition": {
      "duration": 0.25,
      "ease": [
       0.23,
       1,
       0.32,
       1
      ]
     }
    },
    "animate": {
     "x": [
      0,
      2,
      0
     ],
     "transition": {
      "duration": 0.4,
      "delay": 0,
      "ease": "easeInOut"
     }
    }
   }
  },
  "options": {}
 }
};
