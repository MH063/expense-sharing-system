import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api modules used by ExpenseList
vi.mock('@/api/expenses', () => ({
  expenseApi: {
    getExpenses: vi.fn(),
    getExpenseCategories: vi.fn()
  }
}))

vi.mock('@/api/rooms', () => ({
  roomsApi: {
    getUserRooms: vi.fn(),
    getRoomMembers: vi.fn()
  }
}))

import ExpenseList from '../ExpenseList.vue'
import { expenseApi } from '@/api/expenses'
import { roomsApi } from '@/api/rooms'

const flushPromises = () => new Promise(setImmediate)

describe('ExpenseList - 新风格响应结构', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('能消费 { success, payload } 返回并渲染列表', async () => {
    // Arrange mocks with new style response
    expenseApi.getExpenses.mockResolvedValue({
      success: true,
      payload: {
        data: [
          {
            id: 1,
            title: '晚餐',
            category: 'food',
            date: Date.now(),
            payerName: '小明',
            payerId: 'u1',
            amount: 36.5,
            myShare: 12.2,
            status: 'pending'
          }
        ],
        total: 1
      },
      message: '',
      code: 200
    })

    expenseApi.getExpenseCategories.mockResolvedValue({
      success: true,
      payload: []
    })

    roomsApi.getUserRooms.mockResolvedValue({ success: true, payload: [] })

    // Act
    const wrapper = mount(ExpenseList)
    await flushPromises()

    // Assert: the first expense title should appear in DOM
    expect(wrapper.text()).toContain('晚餐')
  })

  it('错误时显示错误信息日志路径不抛异常', async () => {
    expenseApi.getExpenses.mockResolvedValue({ success: false, payload: null, message: '失败', code: 500 })
    expenseApi.getExpenseCategories.mockResolvedValue({ success: true, payload: [] })
    roomsApi.getUserRooms.mockResolvedValue({ success: true, payload: [] })

    const wrapper = mount(ExpenseList)
    await flushPromises()

    // 没有数据渲染则出现空态块
    expect(wrapper.text()).toContain('暂无费用记录')
  })
})