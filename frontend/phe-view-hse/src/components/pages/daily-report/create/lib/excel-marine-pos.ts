
export const marinePosTemplate = {
  identity: {
    reportDate: {r: 0, c: 9, type: "date"},
    // reportedBy: {r: 1, c: 5, type: "text"},
    // subtypeName: {r: 1, c: 10, type: "text"},
  },
  lagging: {
    freeLtaDays: {r: 17, c: 2, type: "number"},
    freeRiDays: {r: 18, c: 2, type: "number"},
  },
  operation: {
    region: [{r: 11, c: 2, type: "text"}, {r: 11, c: 5, type: "text"}, {r: 11, c: 8, type: "text"}],
    currentHiPoActivity: [{r: 12, c: 2, type: "text"}, {r: 12, c: 5, type: "text"}, {r: 12, c: 8, type: "text"}],
    forecastHiPoActivity: [{r: 13, c: 2, type: "text"}, {r: 13, c: 5, type: "text"}, {r: 13, c: 8, type: "text"}],
    windSpeed: [{r: 14, c: 2, type: "text"}, {r: 14, c: 5, type: "text"}, {r: 14, c: 8, type: "text"}],
    seaLevel: [{r: 14, c: 3, type: "text"}, {r: 14, c: 6, type: "text"}, {r: 14, c: 10, type: "text"}],
    skyCondition: [{r: 14, c: 4, type: "text"}, {r: 14, c: 7, type: "text"}, {r: 14, c: 11, type: "text"}],
  },
  smartCard: {
    description: {r: 30, c: 2, type: "text"},
  }
}