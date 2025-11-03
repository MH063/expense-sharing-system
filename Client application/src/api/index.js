// 导出所有API模块
export * from './bill-api'
export * from './bills'
export * from './expenses'
export * from './payments'
export * from './rooms'
export * from './user'
export * from './invite-codes'
export * from './qr-codes'
export * from './analytics'
export * from './disputes'
export * from './reviews'
export * from './http'
export * from './request'

// 默认导出API对象
import * as billApi from './bill'
import * as roomsApi from './rooms'
import * as userApi from './user'
import * as expensesApi from './expenses'
import * as paymentsApi from './payments'
import * as inviteCodesApi from './invite-codes'
import * as qrCodesApi from './qr-codes'
import * as analyticsApi from './analytics'
import * as disputesApi from './disputes'
import * as reviewsApi from './reviews'

// 导入各个API对象
import { billApi as bill } from './bill'
import { roomsApi as rooms } from './rooms'
import { userApi as user } from './user'
import { expensesApi as expenses } from './expenses'
import { paymentsApi as payments } from './payments'
import { inviteCodesApi as inviteCodes } from './invite-codes'
import { qrCodesApi as qrCodes } from './qr-codes'
import { analyticsApi as analytics } from './analytics'
import { disputesApi as disputes } from './disputes'
import { reviewsApi as reviews } from './reviews'

export default {
  // 命名空间方式
  bill: billApi,
  rooms: roomsApi,
  user: userApi,
  expenses: expensesApi,
  payments: paymentsApi,
  inviteCodes: inviteCodesApi,
  qrCodes: qrCodesApi,
  analytics: analyticsApi,
  disputes: disputesApi,
  reviews: reviewsApi,
  // 直接API对象方式
  billApi: bill,
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