<template>
  <v-radio-group
    :value="formData()"
    v-bind="$attrs"
    @change="handleRadioSelect"
  >
    <v-radio
      v-for="(field, index) in fields"
      :key="index"
      :value="getValue(field)"
    >
      <div v-html="getLabel(field)" slot="label"></div>
    </v-radio>
  </v-radio-group>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import _ from 'lodash';

@Component({
  name: 'RadioGroup',
})
export default class RadioGroup extends Vue {
  @Prop() updateForm!: any;
  @Prop() fields!: any[];
  @Prop() updatePath!: string;
  @Prop() form!: any;

  handleRadioSelect(value: any) {
    this.updateForm(this.updatePath, value);
  }

  getLabel(field: any) {
    return typeof field === 'string' ? field : field.label;
  }

  getValue(field: any) {
    return typeof field === 'string' ? field : field.value;
  }

  formData() {
    return _.get(this.form, this.updatePath);
  }
}
</script>

<style scoped></style>
