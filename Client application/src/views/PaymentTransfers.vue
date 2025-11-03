<template>
  <div class="payment-transfers-container">
    <div class="page-header">
      <h1>支付转移记录</h1>
      <el-button @click="$router.go(-1)">
        <i class="el-icon-back"></i> 返回
      </el-button>
    </div>

    <div class="bill-info" v-if="bill">
      <el-card>
        <div slot="header">
          <span>账单信息</span>
        </div>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="info-item">
              <span class="label">账单标题:</span>
              <span class="value">{{ bill.title }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="info-item">
              <span class="label">总金额:</span>
              <span class="value">¥{{ bill.total_amount.toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="info-item">
              <span class="label">状态:</span>
              <el-tag :type="getStatusType(bill.status)">
                {{ getStatusName(bill.status) }}
              </el-tag>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <div class="transfers-section">
      <el-card>
        <div slot="header">
          <span>支付转移记录</span>
          <el-button
            v-if="hasPayerToPayerRule && bill && bill.status !== 'paid'"
            type="primary"
            size="small"
            style="float: right"
            @click="showTransferDialog = true"
          >
            <i class="el-icon-plus"></i> 创建支付转移
          </el-button>
        </div>
        
        <el-table :data="transfers" v-loading="loading" style="width: 100%">
          <el-table-column prop="from_user_name" label="支付人" width="120"></el-table-column>
          <el-table-column prop="to_user_name" label="收款人" width="120"></el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template slot-scope="scope">
              ¥{{ scope.row.amount.toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式" width="120">
            <template slot-scope="scope">
              {{ getPaymentMethodName(scope.row.payment_method) }}
            </template>
          </el-table-column>
          <el-table-column prop="transaction_id" label="交易ID" width="150" show-overflow-tooltip></el-table-column>
          <el-table-column prop="notes" label="备注" show-overflow-tooltip></el-table-column>
          <el-table-column prop="transfer_time" label="转移时间" width="180">
            <template slot-scope="scope">
              {{ formatDateTime(scope.row.transfer_time) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 创建支付转移对话框 -->
    <el-dialog
      title="创建支付转移"
      :visible.sync="showTransferDialog"
      width="40%"
      @close="resetTransferForm"
    >
      <el-form :model="transferForm" :rules="transferFormRules" ref="transferForm" label-width="100px">
        <el-form-item label="收款人" prop="to_user_id">
          <el-select
            v-model="transferForm.to_user_id"
            placeholder="请选择收款人"
            style="width: 100%"
          >
            <el-option
              v-for="user in billUsers"
              :key="user.user_id"
              :label="user.username"
              :value="user.user_id"
              :disabled="user.user_id === currentUser.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="transferForm.amount"
            :min="0.01"
            :step="0.01"
            :precision="2"
            style="width: 100%"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="支付方式" prop="payment_method">
          <el-select v-model="transferForm.payment_method" placeholder="请选择支付方式" style="width: 100%">
            <el-option
              v-for="method in paymentMethods"
              :key="method.value"
              :label="method.label"
              :value="method.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="交易ID" prop="transaction_id">
          <el-input v-model="transferForm.transaction_id" placeholder="请输入交易ID"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="transferForm.notes"
            type="textarea"
            placeholder="请输入备注信息"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="showTransferDialog = false">取消</el-button>
        <el-button type="primary" @click="createTransfer">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { billApi } from '@/api';

export default {
  name: 'PaymentTransfers',
  data() {
    return {
      loading: false,
      bill: null,
      transfers: [],
      billUsers: [],
      hasPayerToPayerRule: false,
      showTransferDialog: false,
      transferForm: {
        to_user_id: '',
        amount: 0,
        payment_method: '',
        transaction_id: '',
        notes: ''
      },
      transferFormRules: {
        to_user_id: [
          { required: true, message: '请选择收款人', trigger: 'change' }
        ],
        amount: [
          { required: true, message: '请输入金额', trigger: 'blur' }
        ],
        payment_method: [
          { required: true, message: '请选择支付方式', trigger: 'change' }
        ]
      },
      paymentMethods: [
        { value: 'wechat', label: '微信' },
        { value: 'alipay', label: '支付宝' },
        { value: 'cash', label: '现金' },
        { value: 'bank_transfer', label: '银行转账' }
      ]
    };
  },
  computed: {
    ...mapGetters(['isAuthenticated', 'currentUser']),
    billId() {
      return this.$route.params.billId;
    }
  },
  created() {
    this.fetchBillInfo();
    this.fetchTransfers();
    this.checkPayerToPayerRule();
  },
  methods: {
    async fetchBillInfo() {
      try {
        const response = await billApi.getBillById(this.billId);
        if (response.data.success) {
          this.bill = response.data.data.bill;
          // 获取账单分摊用户
          await this.fetchBillUsers();
        }
      } catch (error) {
        console.error('获取账单信息失败:', error);
        this.$message.error('获取账单信息失败');
      }
    },
    async fetchBillUsers() {
      try {
        const response = await billApi.getBillSplits(this.billId);
        if (response.data.success) {
          this.billUsers = response.data.data.splits.map(split => ({
            user_id: split.user_id,
            username: split.username,
            amount: split.amount,
            status: split.status
          }));
        }
      } catch (error) {
        console.error('获取账单用户失败:', error);
      }
    },
    async fetchTransfers() {
      this.loading = true;
      try {
        const response = await billApi.getPaymentTransfers(this.billId);
        if (response.data.success) {
          this.transfers = response.data.data.transfers;
        }
      } catch (error) {
        console.error('获取支付转移记录失败:', error);
        this.$message.error('获取支付转移记录失败');
      } finally {
        this.loading = false;
      }
    },
    async checkPayerToPayerRule() {
      try {
        const response = await billApi.getApplicableRules(this.billId);
        if (response.data.success) {
          const rules = response.data.data.applicable_rules;
          this.hasPayerToPayerRule = rules.some(rule => rule.rule_type === 'payer_to_payer');
        }
      } catch (error) {
        console.error('检查支付规则失败:', error);
      }
    },
    getStatusName(status) {
      const statusMap = {
        'pending': '待支付',
        'partial': '部分支付',
        'paid': '已支付',
        'cancelled': '已取消'
      };
      return statusMap[status] || status;
    },
    getStatusType(status) {
      const typeMap = {
        'pending': 'warning',
        'partial': 'primary',
        'paid': 'success',
        'cancelled': 'info'
      };
      return typeMap[status] || 'info';
    },
    getPaymentMethodName(method) {
      const methodMap = {
        'wechat': '微信',
        'alipay': '支付宝',
        'cash': '现金',
        'bank_transfer': '银行转账'
      };
      return methodMap[method] || method;
    },
    formatDateTime(dateTime) {
      if (!dateTime) return '';
      const date = new Date(dateTime);
      return date.toLocaleString('zh-CN');
    },
    async createTransfer() {
      this.$refs.transferForm.validate(async (valid) => {
        if (valid) {
          try {
            await billApi.createPaymentTransfer(this.billId, this.transferForm);
            this.$message.success('支付转移记录创建成功');
            this.showTransferDialog = false;
            this.fetchTransfers();
            this.fetchBillInfo(); // 刷新账单状态
          } catch (error) {
            console.error('创建支付转移记录失败:', error);
            this.$message.error('创建支付转移记录失败');
          }
        }
      });
    },
    resetTransferForm() {
      this.transferForm = {
        to_user_id: '',
        amount: 0,
        payment_method: '',
        transaction_id: '',
        notes: ''
      };
      if (this.$refs.transferForm) {
        this.$refs.transferForm.resetFields();
      }
    }
  }
};
</script>

<style scoped>
.payment-transfers-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.bill-info {
  margin-bottom: 20px;
}

.info-item {
  margin-bottom: 10px;
}

.info-item .label {
  font-weight: bold;
  margin-right: 10px;
}

.transfers-section {
  margin-bottom: 20px;
}
</style>