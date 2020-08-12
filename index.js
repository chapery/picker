
// singleSelect
new Picker('.singleSelect', {
    columns: [
        {
            selected: 2,
            options: [
                {
                    key: 1,
                    value: '选项1'
                },
                {
                    key: 2,
                    value: '选项2'
                },
                {
                    key: 3,
                    value: '选项3'
                },
                {
                    key: 4,
                    value: '选项4'
                },
                {
                    key: 5,
                    value: '选项5'
                },
                {
                    key: 6,
                    value: '选项6'
                },
                {
                    key: 7,
                    value: '选项7'
                },
                {
                    key: 8,
                    value: '选项8'
                },
                {
                    key: 9,
                    value: '选项9'
                },
                {
                    key: 10,
                    value: '选项10'
                },
            ]
        },
    ]
});

// multiSelect
new Picker('.multiSelect', {
    columns: [
        {
            selected: 1,
            options: [
                {
                    key: 1,
                    value: '周一'
                },
                {
                    key: 2,
                    value: '周二'
                },
                {
                    key: 3,
                    value: '周三'
                },
                {
                    key: 4,
                    value: '周四'
                },
                {
                    key: 5,
                    value: '周五'
                },
                {
                    key: 6,
                    value: '周六'
                },
                {
                    key: 7,
                    value: '周日'
                },
            ]
        },
        {
            selected: 2,
            options: [
                {
                    key: 1,
                    value: '上午'
                },
                {
                    key: 2,
                    value: '下午'
                },
            ]
        }
    ]
});

// date
new Picker('.date', {
    type: 'date'
})