/**
 * Usability Testing & First-Time Buyer Assessment Utilities
 *
 * Conforms to:
 * - SRS NFR-USAB-01: At least 80% of first-time test users (minimum 5 buyers) shall complete
 *   "find a vegetable and place an order" without assistance.
 * - SRS NFR-USAB-02 to NFR-USAB-05: Accessible contrast, touch targets >= 44x44px,
 *   Naira (₦) formatting with units, accessible form autocomplete attributes.
 * - SRS Section 8.3: Release Acceptance Criteria (TC-08 to TC-18 pass; >= 80% unassisted completion).
 */

export const USABILITY_BENCHMARKS = {
  MIN_FIRST_TIME_BUYERS: 5,
  MIN_UNASSISTED_COMPLETION_RATE: 0.8, // 80%
  TARGET_UNASSISTED_COMPLETION_RATE: 1.0, // 100% ideal
  MAX_AVERAGE_TASK_DURATION_SECONDS: 300, // 5 minutes
  MAX_ACCEPTABLE_ERROR_RATE: 0.2, // 20%
};

/**
 * Standard First-Time Buyer Personas for Usability Testing Cohort (NFR-USAB-01)
 */
export const FIRST_TIME_BUYER_COHORT = [
  {
    id: 'buyer-01',
    name: 'Zainab Aliyu',
    location: 'Kano',
    device: 'Mobile (Android / Chrome)',
    technicalSkill: 'Low-Moderate',
    primaryGoal: 'Find fresh tomatoes and place an order via pay-on-delivery',
    targetVegetable: 'Fresh Tomatoes',
    deliveryAddress: {
      name: 'Zainab Aliyu',
      phone: '+2348023456781',
      street: '14 Bompai Road',
      town: 'Nassarawa',
      state: 'Kano',
      notes: 'Near Bompai Police Station',
    },
  },
  {
    id: 'buyer-02',
    name: 'Emeka Okafor',
    location: 'Lagos',
    device: 'Desktop (Chrome / Windows)',
    technicalSkill: 'Moderate',
    primaryGoal: 'Filter catalogue for fresh leafy greens and place bulk order',
    targetVegetable: 'Fresh Spinach',
    deliveryAddress: {
      name: 'Emeka Okafor',
      phone: '+2348034567892',
      street: '22 Allen Avenue',
      town: 'Ikeja',
      state: 'Lagos',
      notes: 'Opposite Ikeja Medical Centre',
    },
  },
  {
    id: 'buyer-03',
    name: 'Bolanle Adeleke',
    location: 'Ibadan',
    device: 'Tablet (Safari / iPadOS)',
    technicalSkill: 'Low-Moderate',
    primaryGoal:
      'Search for red bell peppers and review unit prices before checkout',
    targetVegetable: 'Bell Peppers',
    deliveryAddress: {
      name: 'Bolanle Adeleke',
      phone: '+2348056789013',
      street: 'Plot 7 Ring Road',
      town: 'Challenge',
      state: 'Oyo',
      notes: 'Beside Mobil Filling Station',
    },
  },
  {
    id: 'buyer-04',
    name: 'Fatima Bello',
    location: 'Abuja',
    device: 'Mobile (Samsung Internet)',
    technicalSkill: 'Moderate',
    primaryGoal:
      'Browse marketplace homepage, add multiple items, confirm delivery info',
    targetVegetable: 'Fresh Carrots',
    deliveryAddress: {
      name: 'Fatima Bello',
      phone: '+2348078901234',
      street: 'Flat 4 Area 11',
      town: 'Garki',
      state: 'FCT (Abuja)',
      notes: 'Behind Federal Secretariat',
    },
  },
  {
    id: 'buyer-05',
    name: 'Chidi Nwosu',
    location: 'Port Harcourt',
    device: 'Mobile (iOS / Safari)',
    technicalSkill: 'Low',
    primaryGoal:
      'Quick unassisted mobile purchase of onions straight from farm listing',
    targetVegetable: 'Red Onions',
    deliveryAddress: {
      name: 'Chidi Nwosu',
      phone: '+2348090123456',
      street: '15 Aba Road',
      town: 'Old GRA',
      state: 'Rivers',
      notes: 'Adjacent Hotel Presidential',
    },
  },
];

/**
 * Calculates unassisted task completion rate for a cohort of usability sessions.
 *
 * @param {Array<{ completedUnassisted: boolean }>} sessions
 * @returns {number} Completion rate between 0.0 and 1.0 (rounded to 2 decimal places)
 */
export function calculateUnassistedCompletionRate(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return 0;
  }

  const unassistedCount = sessions.filter(
    (s) => s && s.completedUnassisted === true
  ).length;

  return Math.round((unassistedCount / sessions.length) * 100) / 100;
}

/**
 * Evaluates a completed buyer usability session against standard acceptance criteria.
 *
 * @param {{
 *   userId: string,
 *   userName: string,
 *   foundVegetable: boolean,
 *   addedToCart: boolean,
 *   completedCheckout: boolean,
 *   receivedAssistance: boolean,
 *   durationSeconds?: number,
 *   errorCount?: number,
 *   orderId?: string
 * }} session
 * @returns {{
 *   valid: boolean,
 *   completedUnassisted: boolean,
 *   taskSuccessful: boolean,
 *   durationSeconds: number,
 *   errorCount: number
 * }}
 */
export function evaluateBuyerSession(session = {}) {
  if (session && typeof session.completedUnassisted === 'boolean') {
    return session;
  }

  const foundVegetable = Boolean(session.foundVegetable);
  const addedToCart = Boolean(session.addedToCart);
  const completedCheckout = Boolean(session.completedCheckout);
  const receivedAssistance = Boolean(session.receivedAssistance);
  const durationSeconds =
    typeof session.durationSeconds === 'number' && session.durationSeconds >= 0
      ? session.durationSeconds
      : 0;
  const errorCount =
    typeof session.errorCount === 'number' && session.errorCount >= 0
      ? session.errorCount
      : 0;

  const taskSuccessful = foundVegetable && addedToCart && completedCheckout;
  const completedUnassisted = taskSuccessful && !receivedAssistance;

  return {
    ...session,
    valid: Boolean(session.userId),
    completedUnassisted,
    taskSuccessful,
    durationSeconds,
    errorCount,
  };
}

/**
 * Audits an entire usability test cohort against NFR-USAB-01 requirements:
 * - >= 5 first-time test buyers
 * - >= 80% complete unassisted
 *
 * @param {Array<Object>} sessionRecords
 * @returns {{
 *   compliant: boolean,
 *   totalUsers: number,
 *   unassistedSuccessCount: number,
 *   unassistedRate: number,
 *   benchmarkRate: number,
 *   averageDurationSeconds: number,
 *   averageErrorCount: number,
 *   status: 'passed' | 'failed',
 *   recommendation?: string
 * }}
 */
export function auditUsabilityTestCohort(sessionRecords = []) {
  const sessions = Array.isArray(sessionRecords) ? sessionRecords : [];
  const evaluatedSessions = sessions.map(evaluateBuyerSession);

  const totalUsers = evaluatedSessions.length;
  const unassistedSuccessCount = evaluatedSessions.filter(
    (s) => s.completedUnassisted
  ).length;

  const unassistedRate =
    totalUsers > 0
      ? Math.round((unassistedSuccessCount / totalUsers) * 100) / 100
      : 0;

  const totalDuration = evaluatedSessions.reduce(
    (sum, s) => sum + s.durationSeconds,
    0
  );
  const averageDurationSeconds =
    totalUsers > 0 ? Math.round(totalDuration / totalUsers) : 0;

  const totalErrors = evaluatedSessions.reduce(
    (sum, s) => sum + s.errorCount,
    0
  );
  const averageErrorCount =
    totalUsers > 0 ? Math.round((totalErrors / totalUsers) * 100) / 100 : 0;

  const hasMinimumUsers =
    totalUsers >= USABILITY_BENCHMARKS.MIN_FIRST_TIME_BUYERS;
  const meetsCompletionThreshold =
    unassistedRate >= USABILITY_BENCHMARKS.MIN_UNASSISTED_COMPLETION_RATE;

  const compliant = hasMinimumUsers && meetsCompletionThreshold;

  let recommendation;
  if (!hasMinimumUsers) {
    recommendation = `Cohort has only ${totalUsers} buyers. NFR-USAB-01 requires a minimum of ${USABILITY_BENCHMARKS.MIN_FIRST_TIME_BUYERS} first-time buyers.`;
  } else if (!meetsCompletionThreshold) {
    recommendation = `Unassisted completion rate (${Math.round(unassistedRate * 100)}%) is below the required 80% threshold.`;
  }

  return {
    compliant,
    totalUsers,
    unassistedSuccessCount,
    unassistedRate,
    benchmarkRate: USABILITY_BENCHMARKS.MIN_UNASSISTED_COMPLETION_RATE,
    averageDurationSeconds,
    averageErrorCount,
    status: compliant ? 'passed' : 'failed',
    ...(recommendation ? { recommendation } : {}),
  };
}
