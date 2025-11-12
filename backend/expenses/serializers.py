from rest_framework import serializers

from .models import Expense, ExpenseType


class ExpenseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseType
        fields = ['id', 'name', 'description', 'is_active']


class ExpenseSerializer(serializers.ModelSerializer):
    type_name = serializers.CharField(source='type.name', read_only=True)
    card_name = serializers.CharField(source='card.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'

    def validate(self, attrs):
        method = attrs.get('method') or getattr(self.instance, 'method', None)
        card = attrs.get('card') or getattr(self.instance, 'card', None)
        if method == 'karta' and not card:
            raise serializers.ValidationError({'card': "Karta usulida karta tanlash majburiy."})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and not validated_data.get('created_by'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
