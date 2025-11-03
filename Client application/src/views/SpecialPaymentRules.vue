<template>
  <div class="special-payment-rules-container">
    <div class="page-header">
      <h1>特殊支付规则管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <i class="el-icon-plus"></i> 创建规则
      </el-button>
    </div>

    <div class="rules-list">
      <el-table :data="rules" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="规则名称" width="180"></el-table-column>
        <el-table-column prop="rule_type" label="规则类型" width="150">
          <template slot-scope="scope">
            <el-tag :type="getRuleTypeTag(scope.row.rule_type)">
              {{ getRuleTypeName(scope.row.rule_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip></el-table-column>
        <el-table-column prop="priority" label="优先级" width="100"></el-table-column>
        <el-table-column prop="is_active" label="状态" width="100">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.is_active"
              @change="toggleRuleStatus(scope.row)"
              :disabled="!hasPermission('ROOM_MANAGE')"
            ></el-switch>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建者" width="120"></el-table-column>
        <el-table-column label="操作" width="180">
          <template slot-scope="scope">
            <el-button size="mini" @click="editRule(scope.row)">编辑</el-button>
            <el-button size="mini" type="danger" @click="deleteRule(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建/编辑规则对话框 -->
    <el-dialog
      :title="isEditing ? '编辑规则' : '创建规则'"
      :visible.sync="showCreateDialog"
      width="50%"
      @close="resetForm"
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleForm" label-width="120px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称"></el-input>
        </el-form-item>
        <el-form-item label="规则类型" prop="rule_type">
          <el-select v-model="ruleForm.rule_type" placeholder="请选择规则类型" style="width: 100%">
            <el-option
              v-for="type in ruleTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="ruleForm.description"
            type="textarea"
            placeholder="请输入规则描述"
          ></el-input>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number
            v-model="ruleForm.priority"
            :min="0"
            :max="100"
            placeholder="数字越小优先级越高"
            style="width: 100%"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="适用条件">
          <div class="conditions-container">
            <el-form-item label="费用类型" label-width="80px">
              <el-select
                v-model="ruleForm.conditions.expense_types"
                multiple
                placeholder="选择适用的费用类型"
                style="width: 100%"
              >
                <el-option
                  v-for="type in expenseTypes"
                  :key="type.id"
                  :label="type.name"
                  :value="type.name"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="最小金额" label-width="80px">
              <el-input-number
                v-model="ruleForm.conditions.min_amount"
                :min="0"
                placeholder="不限制则留空"
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
            <el-form-item label="最大金额" label-width="80px">
              <el-input-number
                v-model="ruleForm.conditions.max_amount"
                :min="0"
                placeholder="不限制则留空"
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
          </div>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRule">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { billApi } from '@/api';

export default {
  name: 'SpecialPaymentRules',
  data() {
    return {
      loading: false,
      rules: [],
      expenseTypes: [],
      showCreateDialog: false,
      isEditing: false,
      currentRuleId: null,
      ruleForm: {
        name: '',
        rule_type: '',
        description: '',
        priority: 0,
        conditions: {
          expense_types: [],
          min_amount: null,
          max_amount: null
        }
      },
      ruleFormRules: {
        name: [
          { required: true, message: '请输入规则名称', trigger: 'blur' }
        ],
        rule_type: [
          { required: true, message: '请选择规则类型', trigger: 'change' }
        ]
      },
      ruleTypes: [
        { value: 'self_only', label: '仅缴费人本人支付' },
        { value: 'multiple_payers', label: '多人支付' },
        { value: 'payer_to_payer', label: '缴费人之间支付' }
      ]
    };
  },
  computed: {
    ...mapGetters(['isAuthenticated', 'hasPermission']),
    roomId() {
      return this.$route.params.roomId;
    }
  },
  created() {
    this.fetchRules();
    this.fetchExpenseTypes();
  },
  methods: {
    async fetchRules() {
      this.loading = true;
      try {
        // 模拟API调用
        console.log('模拟获取特殊支付规则API调用:', { roomId: this.roomId });
        
        // 模拟API响应延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 模拟规则数据
        this.rules = [
          {
            id: 1,
            name: '电费仅本人支付',
            rule_type: 'self_only',
            description: '电费只能由缴费人本人支付',
            priority: 1,
            is_active: true,
            creator_name: '张三',
            conditions: {
              expense_types: ['电费'],
              min_amount: 0,
              max_amount: null
            }
          },
          {
            id: 2,
            name: '水费多人支付',
            rule_type: 'multiple_payers',
            description: '水费允许多人共同支付',
            priority: 2,
            is_active: true,
            creator_name: '李四',
            conditions: {
              expense_types: ['水费'],
              min_amount: 0,
              max_amount: 100
            }
          },
          {
            id: 3,
            name: '大额费用可转移',
            rule_type: 'payer_to_payer',
            description: '超过200元的费用允许缴费人之间转移',
            priority: 3,
            is_active: false,
            creator_name: '王五',
            conditions: {
              expense_types: ['电费', '水费', '网费'],
              min_amount: 200,
              max_amount: null
            }
          }
        ];
      } catch (error) {
        console.error('获取支付规则失败:', error);
        this.$message.error('获取支付规则失败');
      } finally {
        this.loading = false;
      }
    },
    async fetchExpenseTypes() {
      try {
        // 模拟API调用
        console.log('模拟获取费用类型API调用:', { roomId: this.roomId });
        
        // 模拟API响应延迟
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // 模拟费用类型数据
        this.expenseTypes = [
          { id: 1, name: '电费' },
          { id: 2, name: '水费' },
          { id: 3, name: '网费' },
          { id: 4, name: '物业费' },
          { id: 5, name: '燃气费' }
        ];
      } catch (error) {
        console.error('获取费用类型失败:', error);
      }
    },
    getRuleTypeName(type) {
      const ruleType = this.ruleTypes.find(t => t.value === type);
      return ruleType ? ruleType.label : type;
    },
    getRuleTypeTag(type) {
      const tagMap = {
        'self_only': 'primary',
        'multiple_payers': 'success',
        'payer_to_payer': 'warning'
      };
      return tagMap[type] || 'info';
    },
    async toggleRuleStatus(rule) {
      try {
        // 模拟API调用
        console.log('模拟更新规则状态API调用:', { ruleId: rule.id, isActive: rule.is_active });
        
        // 模拟API响应延迟
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // 模拟更新成功
        this.$message.success('规则状态更新成功');
      } catch (error) {
        console.error('更新规则状态失败:', error);
        this.$message.error('更新规则状态失败');
        // 恢复原状态
        rule.is_active = !rule.is_active;
      }
    },
    editRule(rule) {
      this.isEditing = true;
      this.currentRuleId = rule.id;
      this.ruleForm = {
        name: rule.name,
        rule_type: rule.rule_type,
        description: rule.description,
        priority: rule.priority,
        conditions: {
          expense_types: rule.conditions.expense_types || [],
          min_amount: rule.conditions.min_amount || null,
          max_amount: rule.conditions.max_amount || null
        }
      };
      this.showCreateDialog = true;
    },
    async deleteRule(rule) {
      try {
        await this.$confirm('确定要删除此规则吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        // 模拟API调用
        console.log('模拟删除规则API调用:', { ruleId: rule.id });
        
        // 模拟API响应延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 模拟删除成功
        this.$message.success('规则删除成功');
        this.fetchRules();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除规则失败:', error);
          this.$message.error('删除规则失败');
        }
      }
    },
    async saveRule() {
      this.$refs.ruleForm.validate(async (valid) => {
        if (valid) {
          try {
            const data = { ...this.ruleForm };
            
            // 模拟API调用
            console.log('模拟保存规则API调用:', { 
              isEditing: this.isEditing, 
              ruleId: this.currentRuleId, 
              roomId: this.roomId, 
              data 
            });
            
            // 模拟API响应延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟保存成功
            if (this.isEditing) {
              this.$message.success('规则更新成功');
            } else {
              this.$message.success('规则创建成功');
            }
            
            this.showCreateDialog = false;
            this.fetchRules();
          } catch (error) {
            console.error('保存规则失败:', error);
            this.$message.error('保存规则失败');
          }
        }
      });
    },
    resetForm() {
      this.isEditing = false;
      this.currentRuleId = null;
      this.ruleForm = {
        name: '',
        rule_type: '',
        description: '',
        priority: 0,
        conditions: {
          expense_types: [],
          min_amount: null,
          max_amount: null
        }
      };
      if (this.$refs.ruleForm) {
        this.$refs.ruleForm.resetFields();
      }
    }
  }
};
</script>

<style scoped>
.special-payment-rules-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.rules-list {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.conditions-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  background-color: #f9f9f9;
}
</style>