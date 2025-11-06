// 默认导出API对象
import billApiModule from './bill'
import billApiV2 from './bill-api'
import roomsApi from './rooms'
import userApi from './user'
import expensesApi from './expenses'
import paymentsApi from './payments'
import inviteCodeApi from './invite-codes'
import qrCodesApi from './qr-codes'
import analyticsApi from './analytics'
import disputeApi from './disputes'
import reviewApi from './reviews'

// 导入各个API对象
import { billApi as bill } from './bill'
import { billApi as billApiV2Export } from './bill-api'
import { roomsApi as rooms } from './rooms'
import { userApi as user } from './user'
import { expensesApi as expenses } from './expenses'
import { paymentsApi as payments } from './payments'
import { inviteCodesApi as inviteCodes } from './invite-codes'
import { qrCodesApi as qrCodes } from './qr-codes'
import { analyticsApi as analytics } from './analytics'
import { disputeApi as disputes } from './disputes'
import { reviewApi as reviews } from './reviews'

// 命名导出各个API，使用与InviteCodeManagement.vue中导入名称匹配的别名
export { 
  bill as billApi, 
  billApiV2Export, 
  rooms as roomsApi, 
  user as userApi, 
  expenses as expensesApi, 
  payments as paymentsApi, 
  inviteCodes as inviteCodesApi, 
  qrCodes as qrCodesApi, 
  analytics as analyticsApi, 
  disputes as disputesApi, 
  reviews as reviewsApi 
};

export default {
  // 命名空间方式
  bill: billApiModule,
  billApiV2: billApiV2,
  rooms: roomsApi,
  user: userApi,
  expenses: expensesApi,
  payments: paymentsApi,
  inviteCodes: inviteCodeApi,
  qrCodes: qrCodesApi,
  analytics: analyticsApi,
  disputes: disputeApi,
  reviews: reviewApi,
  // 直接API对象方式
  billApi: bill,
  billApiV2Export: billApiV2Export,
  roomsApi: rooms,
  userApi: user,
  expensesApi: expenses,
  paymentsApi: payments,
  inviteCodesApi: inviteCodes,
  qrCodesApi: qrCodes,
  analyticsApi: analytics,
  disputesApi: disputes,
  reviewsApi: reviews
}