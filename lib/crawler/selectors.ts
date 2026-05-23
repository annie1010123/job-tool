// 104 selector abstraction — update here when 104 changes its HTML structure

export const SEARCH = {
  // Search list page
  jobCard: "article.b-block--top-bord",
  jobLink: "a.js-job-link",
  jobTitle: "a.js-job-link",
  companyName: "ul.b-list-inline li:first-child a",
  locationTag: "ul.b-list-inline li",
  nextPageButton: 'button[aria-label="下一頁"]',
};

export const JOB = {
  // Individual job detail page
  title: "h1",
  companyName: 'a.btn-link.t3, .job-header__title a, .breadcrumb-list__item:nth-child(2)',

  // Sidebar / info section
  salaryRange: "p:has-text('月薪'), p:has-text('年薪'), p:has-text('面議')",
  location: "span:has-text('台北'), span:has-text('新北')",
  remote: "span:has-text('遠端')",

  // Parsed from .job-header__title block (regex):
  //   recruitmentActivity: /徵才積極度[：:]\s*(\S+)/
  //   contactTime: /(\d+\s*[小時天]+前聯絡過求職者)/
  jobHeaderBlock: ".job-header__title",

  replyInfo: "p:has-text('天內回覆'), span:has-text('天內回覆'), div:has-text('天內回覆')",

  // Job description
  description: "div.job-description, section.content",
  skills: "div.b-tags--top a, ul.job-requirement-table li",
  seniority: "span:has-text('年以上'), span:has-text('年以下'), span:has-text('不拘')",
};

// 104 area codes for location filtering
export const AREA_CODES = {
  台北市: "6001001000",
  新北市: "6001002000",
};

// Search query builder
export function buildSearchUrl(keyword: string, page = 1): string {
  const areas = Object.values(AREA_CODES).join(",");
  const params = new URLSearchParams({
    ro: "0",
    kwop: "7",
    keyword,
    area: areas,
    order: "15",
    asc: "0",
    sr: "99",
    page: String(page),
    mode: "s",
  });
  return `https://www.104.com.tw/jobs/search/?${params.toString()}`;
}

// 104 job list API (JSON, faster than full page parse)
export function buildApiUrl(keyword: string, page = 1): string {
  const areas = Object.values(AREA_CODES).join(",");
  const params = new URLSearchParams({
    ro: "0",
    kwop: "7",
    keyword,
    area: areas,
    order: "15",
    asc: "0",
    sr: "99",
    page: String(page),
    mode: "s",
    jobsource: "2018indexpoc",
  });
  return `https://www.104.com.tw/jobs/search/list?${params.toString()}`;
}

export function buildJobUrl(jobNo: string): string {
  return `https://www.104.com.tw/job/${jobNo}`;
}
