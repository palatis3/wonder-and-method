// Automatic sends cannot consume the slots reserved for an authenticated owner
// retry. This bounds spend; it does not decide whether an inquiry is legitimate.
export function notificationBudget(env){
 const configured=Number(env.NOTIFICATION_DAILY_LIMIT??50);
 const limit=Number.isSafeInteger(configured)&&configured>=1&&configured<=2000?configured:50;
 const reserved=Number(env.NOTIFICATION_RESERVED_LIMIT??0);
 const reserve=Number.isSafeInteger(reserved)&&reserved>=0&&reserved<limit?reserved:0;
 return {limit,reserve,automaticLimit:limit-reserve};
}
